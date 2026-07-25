import { getBlockchainConfig } from "../config.js";
import { getProvider, getReadContract } from "./blockchain.js";
import { getConfirmedHead } from "../utils/blocks.js";
import { redactSecrets } from "../utils/redact.js";

const certificates = new Map();
let indexReady = false;
let lastProcessedBlock = null;
let lastProcessedBlockHash = null;
let syncPromise = null;
let pollTimer = null;

function applyIssued(log, contract) {
  const parsed = contract.interface.parseLog(log);
  if (!parsed) return;

  const hash = parsed.args.documentHash;
  certificates.set(hash.toLowerCase(), {
    documentHash: hash,
    status: "ACTIVE",
    issuer: parsed.args.issuer,
    issuedAt: Number(parsed.args.issuedAt),
    revokedAt: 0,
    issueTxHash: log.transactionHash,
    issueBlockNumber: Number(log.blockNumber),
    revokeTxHash: null,
    revokeBlockNumber: null,
    revokedBy: null,
  });
}

function applyRevoked(log, contract) {
  const parsed = contract.interface.parseLog(log);
  if (!parsed) return;

  const hash = parsed.args.documentHash.toLowerCase();
  const record = certificates.get(hash);
  if (!record) return;

  Object.assign(record, {
    status: "REVOKED",
    revokedAt: Number(parsed.args.revokedAt),
    revokeTxHash: log.transactionHash,
    revokeBlockNumber: Number(log.blockNumber),
    revokedBy: parsed.args.revokedBy,
  });
}

async function processRange(from, to) {
  const contract = getReadContract();
  const { eventChunkSize } = getBlockchainConfig();

  for (let chunkFrom = from; chunkFrom <= to; chunkFrom += eventChunkSize) {
    const chunkTo = Math.min(to, chunkFrom + eventChunkSize - 1);
    const [issuedLogs, revokedLogs] = await Promise.all([
      contract.queryFilter(
        contract.filters.CertificateIssued(),
        chunkFrom,
        chunkTo,
      ),
      contract.queryFilter(
        contract.filters.CertificateRevoked(),
        chunkFrom,
        chunkTo,
      ),
    ]);

    const logs = [
      ...issuedLogs.map((log) => ({ kind: "issued", log })),
      ...revokedLogs.map((log) => ({ kind: "revoked", log })),
    ].sort(
      (a, b) => a.log.blockNumber - b.log.blockNumber
        || a.log.index - b.log.index,
    );

    for (const { kind, log } of logs) {
      if (kind === "issued") applyIssued(log, contract);
      else applyRevoked(log, contract);
    }
  }
}

async function synchronize() {
  const provider = getProvider();
  const { confirmations, startBlock } = getBlockchainConfig();
  const latestBlock = await provider.getBlockNumber();
  const safeHead = getConfirmedHead(latestBlock, confirmations);

  if (lastProcessedBlock !== null && lastProcessedBlock > safeHead) {
    console.warn("Confirmed chain head moved behind index checkpoint; rebuilding");
    certificates.clear();
    indexReady = false;
    lastProcessedBlock = null;
    lastProcessedBlockHash = null;
  }

  if (
    lastProcessedBlock !== null
    && lastProcessedBlockHash
    && lastProcessedBlock <= safeHead
  ) {
    const checkpoint = await provider.getBlock(lastProcessedBlock);
    if (!checkpoint || checkpoint.hash !== lastProcessedBlockHash) {
      console.warn("Certificate index checkpoint changed; rebuilding index");
      certificates.clear();
      indexReady = false;
      lastProcessedBlock = null;
      lastProcessedBlockHash = null;
    }
  }

  const from = lastProcessedBlock === null
    ? startBlock
    : lastProcessedBlock + 1;

  if (from <= safeHead) {
    await processRange(from, safeHead);
    const checkpoint = await provider.getBlock(safeHead);
    lastProcessedBlock = safeHead;
    lastProcessedBlockHash = checkpoint?.hash || null;
  }

  indexReady = true;
  return {
    size: certificates.size,
    lastProcessedBlock,
  };
}

export function syncIndex() {
  if (!syncPromise) {
    syncPromise = synchronize().finally(() => {
      syncPromise = null;
    });
  }
  return syncPromise;
}

export async function buildIndex() {
  certificates.clear();
  indexReady = false;
  lastProcessedBlock = null;
  lastProcessedBlockHash = null;

  const result = await syncIndex();
  console.log(`Certificate index built: ${certificates.size} certificates`);
  return result;
}

export function startIndexPolling() {
  if (pollTimer) return pollTimer;
  const { indexPollIntervalMs } = getBlockchainConfig();

  pollTimer = setInterval(() => {
    syncIndex().catch((error) => {
      console.error(
        `Certificate index synchronization failed: ${redactSecrets(error.message)}`,
      );
    });
  }, indexPollIntervalMs);
  pollTimer.unref();
  return pollTimer;
}

export function stopIndexPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

export function isIndexReady() {
  return indexReady;
}

export function getIndexSize() {
  return certificates.size;
}

export function getIndexState() {
  return {
    ready: indexReady,
    size: certificates.size,
    lastProcessedBlock,
  };
}

export function getSummary() {
  let active = 0;
  let revoked = 0;
  for (const record of certificates.values()) {
    if (record.status === "ACTIVE") active++;
    else if (record.status === "REVOKED") revoked++;
  }
  return { total: certificates.size, active, revoked };
}

export function queryCertificates({ status, issuer, page, limit }) {
  let results = Array.from(certificates.values());

  if (status) {
    results = results.filter((record) => record.status === status);
  }

  if (issuer) {
    const address = issuer.toLowerCase();
    results = results.filter(
      (record) => record.issuer.toLowerCase() === address,
    );
  }

  results.sort((a, b) => b.issuedAt - a.issuedAt);

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    certificates: results.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
    summary: getSummary(),
  };
}

export function addRecord(documentHash, record) {
  certificates.set(documentHash.toLowerCase(), record);
}

export function updateRecordStatus(documentHash, updates) {
  const record = certificates.get(documentHash.toLowerCase());
  if (record) Object.assign(record, updates);
}
