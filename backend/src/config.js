import { getAddress } from "ethers";
import { badRequest } from "./utils/httpError.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function parseInteger(value, name, {
  fallback,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
} = {}) {
  const candidate = value === undefined || value === "" ? fallback : value;
  const parsed = Number(candidate);

  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }

  return parsed;
}

export function getBlockchainConfig() {
  const contractAddressValue = required("PRAMAAN_CHAIN_ADDRESS");
  let contractAddress;

  try {
    contractAddress = getAddress(contractAddressValue);
  } catch {
    throw new Error("PRAMAAN_CHAIN_ADDRESS must be a valid Ethereum address");
  }

  return {
    chainId: BigInt(process.env.BLOCKCHAIN_CHAIN_ID || "11155111"),
    contractAddress,
    rpcUrl: required("SEPOLIA_RPC_URL"),
    confirmations: parseInteger(
      process.env.BLOCKCHAIN_CONFIRMATIONS,
      "BLOCKCHAIN_CONFIRMATIONS",
      { fallback: 2, minimum: 1, maximum: 64 },
    ),
    startBlock: parseInteger(
      process.env.PRAMAAN_CHAIN_START_BLOCK,
      "PRAMAAN_CHAIN_START_BLOCK",
      { fallback: 11318772, minimum: 0 },
    ),
    eventChunkSize: parseInteger(
      process.env.EVENT_QUERY_CHUNK_SIZE,
      "EVENT_QUERY_CHUNK_SIZE",
      { fallback: 2_000, minimum: 1, maximum: 10_000 },
    ),
    eventMaxRange: parseInteger(
      process.env.EVENT_MAX_RANGE,
      "EVENT_MAX_RANGE",
      { fallback: 100_000, minimum: 1, maximum: 1_000_000 },
    ),
    indexPollIntervalMs: parseInteger(
      process.env.INDEX_POLL_INTERVAL_MS,
      "INDEX_POLL_INTERVAL_MS",
      { fallback: 15_000, minimum: 1_000, maximum: 3_600_000 },
    ),
  };
}

export function getCorsOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function parseBlockQuery(value, name) {
  if (value === undefined) return undefined;

  try {
    return parseInteger(value, name, { minimum: 0 });
  } catch (error) {
    throw badRequest("INVALID_BLOCK_RANGE", error.message);
  }
}
