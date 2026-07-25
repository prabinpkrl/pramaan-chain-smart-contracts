import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  HttpError,
  badRequest,
  conflict,
  serviceUnavailable,
} from "../utils/httpError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORE_PATH = path.join(
  __dirname,
  "..",
  "..",
  ".data",
  "idempotency.json",
);
const MAX_OPERATIONS = 1_000;

const operations = new Map();
let loadedStorePath = null;

function getStorePath() {
  const configured = process.env.IDEMPOTENCY_STORE_PATH?.trim();
  return configured ? path.resolve(configured) : DEFAULT_STORE_PATH;
}

function serializeError(error) {
  if (!(error instanceof HttpError)) {
    return {
      status: 500,
      code: "BLOCKCHAIN_OPERATION_FAILED",
      message: "Blockchain operation failed",
      details: undefined,
    };
  }

  return {
    status: error.status,
    code: error.code || "BLOCKCHAIN_OPERATION_FAILED",
    message: error.message || "Blockchain operation failed",
    details: error.details,
  };
}

function deserializeError(stored) {
  return new HttpError(
    stored.status,
    stored.code,
    stored.message,
    stored.details,
  );
}

function persistedRecord(record) {
  return {
    fingerprint: record.fingerprint,
    state: record.state,
    value: record.value,
    error: record.error,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function loadOperations() {
  const storePath = getStorePath();
  if (loadedStorePath === storePath) return;

  operations.clear();
  loadedStorePath = storePath;

  if (!fs.existsSync(storePath)) return;

  let stored;
  try {
    stored = JSON.parse(fs.readFileSync(storePath, "utf8"));
  } catch {
    throw new Error("Idempotency store is unreadable or contains invalid JSON");
  }

  if (!stored || stored.version !== 1 || !Array.isArray(stored.operations)) {
    throw new Error("Idempotency store has an unsupported format");
  }

  for (const [key, record] of stored.operations) {
    if (
      typeof key !== "string"
      || !record
      || typeof record.fingerprint !== "string"
      || !["pending", "completed", "failed"].includes(record.state)
    ) {
      throw new Error("Idempotency store contains an invalid operation");
    }

    operations.set(key, {
      ...record,
      promise: null,
    });
  }
}

function persistOperations() {
  if (!loadedStorePath) return;

  const directory = path.dirname(loadedStorePath);
  const temporaryPath = `${loadedStorePath}.${process.pid}.tmp`;
  const payload = JSON.stringify({
    version: 1,
    operations: Array.from(operations, ([key, record]) => [
      key,
      persistedRecord(record),
    ]),
  });

  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(temporaryPath, payload, { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temporaryPath, loadedStorePath);
}

function pruneCompletedOperations(targetSize = MAX_OPERATIONS) {
  if (operations.size <= targetSize) return;

  for (const [key, operation] of operations) {
    if (operation.state === "completed") {
      operations.delete(key);
    }
    if (operations.size <= targetSize) return;
  }
}

function ensureCapacity() {
  pruneCompletedOperations(MAX_OPERATIONS - 1);
  if (operations.size >= MAX_OPERATIONS) {
    throw serviceUnavailable(
      "IDEMPOTENCY_STORE_FULL",
      "Idempotency store is full of unresolved operations",
    );
  }
}

export async function runIdempotent({
  key,
  operation,
  fingerprint,
  execute,
}) {
  loadOperations();

  if (!key || key.length > 200) {
    throw badRequest(
      "INVALID_IDEMPOTENCY_KEY",
      "A non-empty Idempotency-Key header of at most 200 characters is required",
    );
  }

  const storageKey = `${operation}:${key}`;
  const existing = operations.get(storageKey);

  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw conflict(
        "IDEMPOTENCY_KEY_REUSED",
        "Idempotency-Key was already used with a different request",
      );
    }

    if (existing.promise) {
      return {
        value: await existing.promise,
        replayed: true,
      };
    }
    if (existing.state === "completed") {
      return {
        value: existing.value,
        replayed: true,
      };
    }
    if (existing.state === "failed") {
      throw deserializeError(existing.error);
    }

    throw conflict(
      "IDEMPOTENCY_OPERATION_UNRESOLVED",
      "This operation was interrupted; inspect blockchain state before retrying",
    );
  }

  ensureCapacity();
  const now = new Date().toISOString();
  const record = {
    fingerprint,
    state: "pending",
    promise: null,
    value: undefined,
    error: undefined,
    createdAt: now,
    updatedAt: now,
  };

  operations.set(storageKey, record);
  persistOperations();

  record.promise = Promise.resolve()
    .then(execute)
    .then((value) => {
      record.state = "completed";
      record.value = value;
      record.updatedAt = new Date().toISOString();
      record.promise = null;
      pruneCompletedOperations();
      persistOperations();
      return value;
    })
    .catch((error) => {
      record.promise = null;
      if (Number.isInteger(error?.status) && error.status < 500) {
        operations.delete(storageKey);
      } else {
        record.state = "failed";
        record.error = serializeError(error);
        record.updatedAt = new Date().toISOString();
      }
      persistOperations();
      throw error;
    });

  return {
    value: await record.promise,
    replayed: false,
  };
}

export function clearIdempotencyCache({ deleteStore = true } = {}) {
  operations.clear();
  const storePath = loadedStorePath || getStorePath();
  loadedStorePath = null;

  if (deleteStore) {
    fs.rmSync(storePath, { force: true });
  }
}

export function reloadIdempotencyStore() {
  operations.clear();
  loadedStorePath = null;
  loadOperations();
}
