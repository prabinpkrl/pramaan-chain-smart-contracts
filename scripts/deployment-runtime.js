import fs from "node:fs";
import path from "node:path";
import { ZeroAddress, getAddress } from "ethers";

export const SEPOLIA_CHAIN_ID = "11155111";
export const DEFAULT_RUNTIME_PATH = ".docker-state/runtime.env";
export const DEFAULT_EVIDENCE_PATH = ".docker-state/deployment.json";

function nonEmpty(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function address(value, name) {
  let normalized;
  try {
    normalized = getAddress(nonEmpty(value, name));
  } catch {
    throw new Error(`${name} must be a valid Ethereum address`);
  }
  if (normalized === ZeroAddress) {
    throw new Error(`${name} cannot be the zero address`);
  }
  return normalized;
}

function blockNumber(value) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("deploymentBlockNumber must be a non-negative safe integer");
  }
  return parsed;
}

export function normalizeSourceCommit(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/u.test(normalized) || /^0{40}$/u.test(normalized)) {
    throw new Error("SOURCE_COMMIT must be a nonzero full 40-character Git commit SHA");
  }
  return normalized;
}

export function validatedSourceCommit(env = process.env) {
  const sourceCommit = normalizeSourceCommit(env.SOURCE_COMMIT);
  const buildSourceCommit = env.BUILD_SOURCE_COMMIT?.trim().toLowerCase();
  if (buildSourceCommit && buildSourceCommit !== sourceCommit) {
    throw new Error("SOURCE_COMMIT does not match the deployment image revision");
  }
  return sourceCommit;
}

export function normalizeDeploymentMetadata(value) {
  const chainId = nonEmpty(value?.chainId, "chainId");
  if (chainId !== SEPOLIA_CHAIN_ID) {
    throw new Error(`chainId must be Sepolia (${SEPOLIA_CHAIN_ID})`);
  }

  const administrator = address(value?.administrator, "administrator");
  const issuer = value?.issuer === undefined || String(value.issuer).trim() === ""
    ? undefined
    : address(value.issuer, "issuer");
  if (issuer && administrator.toLowerCase() === issuer.toLowerCase()) {
    throw new Error("administrator and issuer must be different addresses");
  }

  return {
    chainId,
    contractAddress: address(value?.contractAddress, "contractAddress"),
    deploymentBlockNumber: blockNumber(value?.deploymentBlockNumber),
    administrator,
    ...(issuer ? { issuer } : {}),
  };
}

export function serializeRuntimeEnv(value) {
  const metadata = normalizeDeploymentMetadata(value);
  const lines = [
    `BLOCKCHAIN_CHAIN_ID=${metadata.chainId}`,
    `PRAMAAN_CHAIN_ADDRESS=${metadata.contractAddress}`,
    `PRAMAAN_CHAIN_START_BLOCK=${metadata.deploymentBlockNumber}`,
    `ADMINISTRATOR_ADDRESS=${metadata.administrator}`,
  ];
  if (metadata.issuer) lines.push(`ISSUER_ADDRESS=${metadata.issuer}`);
  return [...lines, ""].join("\n");
}

export function parseRuntimeEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`Invalid runtime environment line: ${line}`);
    values[line.slice(0, separator)] = line.slice(separator + 1);
  }
  return normalizeDeploymentMetadata({
    chainId: values.BLOCKCHAIN_CHAIN_ID,
    contractAddress: values.PRAMAAN_CHAIN_ADDRESS,
    deploymentBlockNumber: values.PRAMAAN_CHAIN_START_BLOCK,
    administrator: values.ADMINISTRATOR_ADDRESS,
    issuer: values.ISSUER_ADDRESS,
  });
}

function atomicWrite(filePath, contents, { mode = 0o600 } = {}) {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temporary, contents, { encoding: "utf8", mode });
  fs.renameSync(temporary, resolved);
}

export function writeRuntimeEnv(filePath, value, { overwrite = false } = {}) {
  const resolved = path.resolve(filePath);
  assertRuntimeWritable(resolved, { overwrite });
  atomicWrite(resolved, serializeRuntimeEnv(value), { mode: 0o644 });
}

export function assertRuntimeWritable(filePath, { overwrite = false } = {}) {
  const resolved = path.resolve(filePath);
  if (!overwrite && fs.existsSync(resolved)) {
    throw new Error(
      `Runtime deployment already exists at ${resolved}; refusing to overwrite it`,
    );
  }
}

export function readRuntimeEnv(filePath = DEFAULT_RUNTIME_PATH) {
  return parseRuntimeEnv(fs.readFileSync(path.resolve(filePath), "utf8"));
}

export function readRuntimeEnvIfPresent(filePath = DEFAULT_RUNTIME_PATH) {
  try {
    return readRuntimeEnv(filePath);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export function writeEvidence(filePath, value) {
  atomicWrite(
    filePath,
    `${JSON.stringify({ ...value, updatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
}

export function readEvidence(filePath = DEFAULT_EVIDENCE_PATH) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

export function runtimePath(env = process.env) {
  return env.DEPLOYMENT_RUNTIME_PATH?.trim() || DEFAULT_RUNTIME_PATH;
}

export function evidencePath(env = process.env) {
  return env.DEPLOYMENT_EVIDENCE_PATH?.trim() || DEFAULT_EVIDENCE_PATH;
}

export function redactError(error, env = process.env) {
  let message = error instanceof Error ? error.message : String(error);
  for (const name of [
    "SEPOLIA_RPC_URL",
    "DEPLOYER_PRIVATE_KEY",
    "ISSUER_PRIVATE_KEY",
    "ETHERSCAN_API_KEY",
  ]) {
    const secret = env[name];
    if (secret) message = message.split(secret).join(`[REDACTED_${name}]`);
  }
  return message
    .replace(/https?:\/\/[^\s"'<>)}\]]+/giu, "[REDACTED_URL]")
    .replace(/https?:\/\/[^/\s:@]+:[^@\s/]+@/giu, "https://[REDACTED]@");
}

export function sanitizedError(error, env = process.env) {
  return new Error(redactError(error, env));
}
