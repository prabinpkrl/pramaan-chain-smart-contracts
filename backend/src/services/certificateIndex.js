import { getProvider, getReadContract } from "./blockchain.js";

const START_BLOCK = BigInt(process.env.PRAMAAN_CHAIN_START_BLOCK || "11318772");
const CONFIRMATIONS = Number(process.env.BLOCKCHAIN_CONFIRMATIONS || "2");

const certificates = new Map();
let indexReady = false;

export async function buildIndex() {
  const contract = getReadContract();
  const provider = getProvider();
  const latestBlock = await provider.getBlockNumber();
  const to = latestBlock - BigInt(CONFIRMATIONS);

  if (START_BLOCK > to) {
    indexReady = true;
    return;
  }

  const issuedFilter = contract.filters.CertificateIssued();
  const issuedLogs = await contract.queryFilter(issuedFilter, START_BLOCK, to);

  for (const log of issuedLogs) {
    const parsed = contract.interface.parseLog(log);
    if (!parsed) continue;

    const hash = parsed.args.documentHash;
    certificates.set(hash.toLowerCase(), {
      documentHash: parsed.args.documentHash,
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

  const revokedFilter = contract.filters.CertificateRevoked();
  const revokedLogs = await contract.queryFilter(revokedFilter, START_BLOCK, to);

  for (const log of revokedLogs) {
    const parsed = contract.interface.parseLog(log);
    if (!parsed) continue;

    const hash = parsed.args.documentHash.toLowerCase();
    const record = certificates.get(hash);
    if (record) {
      record.status = "REVOKED";
      record.revokedAt = Number(parsed.args.revokedAt);
      record.revokeTxHash = log.transactionHash;
      record.revokeBlockNumber = Number(log.blockNumber);
      record.revokedBy = parsed.args.revokedBy;
    }
  }

  indexReady = true;
  console.log(`Certificate index built: ${certificates.size} certificates`);
}

export function isIndexReady() {
  return indexReady;
}

export function getIndexSize() {
  return certificates.size;
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
    const s = status.toUpperCase();
    results = results.filter(r => r.status === s);
  }

  if (issuer) {
    const addr = issuer.toLowerCase();
    results = results.filter(r => r.issuer.toLowerCase() === addr);
  }

  results.sort((a, b) => b.issuedAt - a.issuedAt);

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return {
    certificates: paged,
    pagination: { page, limit, total, totalPages },
    summary: getSummary(),
  };
}

export function getRecordByHash(documentHash) {
  return certificates.get(documentHash.toLowerCase()) || null;
}

export function addRecord(documentHash, record) {
  certificates.set(documentHash.toLowerCase(), record);
}

export function updateRecordStatus(documentHash, updates) {
  const record = certificates.get(documentHash.toLowerCase());
  if (record) {
    Object.assign(record, updates);
  }
}
