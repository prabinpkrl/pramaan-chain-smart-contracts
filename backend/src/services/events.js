import { getBlockchainConfig } from "../config.js";
import { getProvider, getReadContract } from "./blockchain.js";
import {
  getConfirmedHead,
  normalizeBlockRange,
} from "../utils/blocks.js";

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

async function queryEvent(contract, eventName, from, to, chunkSize) {
  const events = [];

  for (let chunkFrom = from; chunkFrom <= to; chunkFrom += chunkSize) {
    const chunkTo = Math.min(to, chunkFrom + chunkSize - 1);
    const logs = await contract.queryFilter(
      contract.filters[eventName](),
      chunkFrom,
      chunkTo,
    );

    for (const log of logs) {
      const decoded = decodeEvent(log, contract.interface);
      if (decoded) events.push(decoded);
    }
  }

  return events;
}

export async function fetchEvents(requestedFrom, requestedTo) {
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

  const eventGroups = await Promise.all(
    EVENT_NAMES.map((eventName) => queryEvent(
      contract,
      eventName,
      range.from,
      range.to,
      config.eventChunkSize,
    )),
  );

  return eventGroups
    .flat()
    .sort(
      (a, b) => a.blockNumber - b.blockNumber
        || a.logIndex - b.logIndex,
    );
}
