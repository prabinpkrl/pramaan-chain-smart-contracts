import { getProvider, getReadContract } from "./blockchain.js";

const START_BLOCK = BigInt(process.env.PRAMAAN_CHAIN_START_BLOCK || "11318772");
const CONFIRMATIONS = Number(process.env.BLOCKCHAIN_CONFIRMATIONS || "2");

const processedEvents = new Map();

function eventKey(txHash, logIndex) {
  return `${txHash}:${logIndex}`;
}

function decodeEvent(log) {
  const contract = getReadContract();
  const iface = contract.interface;

  try {
    const parsed = iface.parseLog(log);
    if (!parsed) return null;

    return {
      eventName: parsed.name,
      blockNumber: Number(log.blockNumber),
      blockHash: log.blockHash,
      transactionHash: log.transactionHash,
      logIndex: Number(log.logIndex),
      args: Object.fromEntries(
        Object.entries(parsed.args).map(([k, v]) => [k, typeof v === "bigint" ? v.toString() : v]),
      ),
    };
  } catch {
    return null;
  }
}

export async function fetchEvents(fromBlock, toBlock) {
  const contract = getReadContract();
  const provider = getProvider();

  const eventNames = [
    "CertificateIssued",
    "CertificateRevoked",
    "IssuerAuthorized",
    "IssuerRemoved",
  ];

  const from = fromBlock ?? START_BLOCK;
  const to = toBlock ?? (await provider.getBlockNumber()) - BigInt(CONFIRMATIONS);

  if (from > to) return [];

  const allEvents = [];

  for (const eventName of eventNames) {
    const filter = contract.filters[eventName]();
    const logs = await contract.queryFilter(filter, from, to);

    for (const log of logs) {
      const key = eventKey(log.transactionHash, log.logIndex);
      if (processedEvents.has(key)) continue;

      const decoded = decodeEvent(log);
      if (decoded) {
        processedEvents.set(key, decoded);
        allEvents.push(decoded);
      }
    }
  }

  allEvents.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);

  return allEvents;
}

export function getProcessedCount() {
  return processedEvents.size;
}

export function clearEvents() {
  processedEvents.clear();
}
