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
    chainId: BigInt(parseInteger(
      process.env.BLOCKCHAIN_CHAIN_ID,
      "BLOCKCHAIN_CHAIN_ID",
      { fallback: 11155111, minimum: 1 },
    )),
    contractAddress,
    rpcUrl: required("SEPOLIA_RPC_URL"),
    rpcRequestTimeoutMs: parseInteger(
      process.env.RPC_REQUEST_TIMEOUT_MS,
      "RPC_REQUEST_TIMEOUT_MS",
      { fallback: 30_000, minimum: 1_000, maximum: 300_000 },
    ),
    confirmations: parseInteger(
      process.env.BLOCKCHAIN_CONFIRMATIONS,
      "BLOCKCHAIN_CONFIRMATIONS",
      { fallback: 2, minimum: 1, maximum: 64 },
    ),
    transactionWaitTimeoutMs: parseInteger(
      process.env.TRANSACTION_WAIT_TIMEOUT_MS,
      "TRANSACTION_WAIT_TIMEOUT_MS",
      { fallback: 180_000, minimum: 10_000, maximum: 1_800_000 },
    ),
    startBlock: parseInteger(
      process.env.PRAMAAN_CHAIN_START_BLOCK,
      "PRAMAAN_CHAIN_START_BLOCK",
      { fallback: 11318772, minimum: 0 },
    ),
    eventChunkSize: parseInteger(
      process.env.EVENT_QUERY_CHUNK_SIZE,
      "EVENT_QUERY_CHUNK_SIZE",
      { fallback: 10_000, minimum: 1, maximum: 10_000 },
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
    indexMaxRetryIntervalMs: parseInteger(
      process.env.INDEX_MAX_RETRY_INTERVAL_MS,
      "INDEX_MAX_RETRY_INTERVAL_MS",
      { fallback: 300_000, minimum: 1_000, maximum: 3_600_000 },
    ),
  };
}

export function getCorsOrigins() {
  return (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getTrustProxy() {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value || value === "false") return false;

  const hops = Number(value);
  if (Number.isSafeInteger(hops) && hops >= 1 && hops <= 10) {
    return hops;
  }

  throw new Error("TRUST_PROXY must be false or an integer from 1 to 10");
}

export function parseBlockQuery(value, name) {
  if (value === undefined) return undefined;

  try {
    return parseInteger(value, name, { minimum: 0 });
  } catch (error) {
    throw badRequest("INVALID_BLOCK_RANGE", error.message);
  }
}
