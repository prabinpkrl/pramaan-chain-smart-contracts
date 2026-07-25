import { getBlockchainConfig } from "../config.js";
import { getProvider, getReadContract } from "./blockchain.js";
import {
  getConfirmedHead,
  normalizeBlockRange,
} from "../utils/blocks.js";
import { HttpError, serviceUnavailable } from "../utils/httpError.js";

const EVENT_NAMES = [
  "CertificateIssued",
  "CertificateRevoked",
  "IssuerAuthorized",
  "IssuerRemoved",
];

function serializeValue(value) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function decodeEvent(log, contractInterface) {
  const parsed = contractInterface.parseLog(log);
  if (!parsed) return null;

  const args = Object.fromEntries(
    parsed.fragment.inputs.map((input, index) => [
      input.name,
      serializeValue(parsed.args[index]),
    ]),
  );

  return {
    eventName: parsed.name,
    blockNumber: Number(log.blockNumber),
    blockHash: log.blockHash,
    transactionHash: log.transactionHash,
    logIndex: Number(log.index),
    args,
  };
}

async function queryEvents(
  provider,
  contract,
  contractAddress,
  eventNames,
  from,
  to,
  chunkSize,
) {
  const events = [];
  const eventTopics = eventNames.map(
    (eventName) => contract.interface.getEvent(eventName).topicHash,
  );

  for (let chunkFrom = from; chunkFrom <= to; chunkFrom += chunkSize) {
    const chunkTo = Math.min(to, chunkFrom + chunkSize - 1);
    const logs = await provider.getLogs({
      address: contractAddress,
      topics: [eventTopics],
      fromBlock: chunkFrom,
      toBlock: chunkTo,
    });

    for (const log of logs) {
      const decoded = decodeEvent(log, contract.interface);
      if (decoded) events.push(decoded);
    }
  }

  return events;
}

export async function fetchEvents(
  requestedFrom,
  requestedTo,
  eventNames = EVENT_NAMES,
) {
  try {
    const contract = getReadContract();
    const provider = getProvider();
    const config = getBlockchainConfig();
    const latestBlock = await provider.getBlockNumber();
    const confirmedHead = getConfirmedHead(latestBlock, config.confirmations);
    const range = normalizeBlockRange({
      requestedFrom,
      requestedTo,
      startBlock: config.startBlock,
      confirmedHead,
      maxRange: config.eventMaxRange,
    });

    if (range.empty) return [];

    const events = await queryEvents(
      provider,
      contract,
      config.contractAddress,
      eventNames,
      range.from,
      range.to,
      config.eventChunkSize,
    );

    return events.sort(
      (a, b) => a.blockNumber - b.blockNumber
        || a.logIndex - b.logIndex,
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw serviceUnavailable(
      "EVENT_HISTORY_UNAVAILABLE",
      "Blockchain event history is temporarily unavailable",
    );
  }
}
