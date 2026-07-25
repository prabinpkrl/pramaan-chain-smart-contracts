import { badRequest, conflict } from "../utils/httpError.js";

const operations = new Map();
const MAX_OPERATIONS = 1_000;

function pruneCompletedOperations() {
  if (operations.size <= MAX_OPERATIONS) return;

  for (const [key, operation] of operations) {
    if (operation.state !== "pending") {
      operations.delete(key);
    }
    if (operations.size <= MAX_OPERATIONS) return;
  }
}

export async function runIdempotent({
  key,
  operation,
  fingerprint,
  execute,
}) {
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

    return {
      value: await existing.promise,
      replayed: true,
    };
  }

  const record = {
    fingerprint,
    state: "pending",
    promise: null,
  };

  record.promise = Promise.resolve()
    .then(execute)
    .then((value) => {
      record.state = "completed";
      return value;
    })
    .catch((error) => {
      record.state = "failed";
      if (Number.isInteger(error?.status) && error.status < 500) {
        operations.delete(storageKey);
      }
      throw error;
    });

  operations.set(storageKey, record);
  pruneCompletedOperations();

  return {
    value: await record.promise,
    replayed: false,
  };
}

export function clearIdempotencyCache() {
  operations.clear();
}
