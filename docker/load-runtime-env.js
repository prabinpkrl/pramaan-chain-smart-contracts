import fs from "node:fs";

const allowed = new Set([
  "BLOCKCHAIN_CHAIN_ID",
  "PRAMAAN_CHAIN_ADDRESS",
  "PRAMAAN_CHAIN_START_BLOCK",
  "ADMINISTRATOR_ADDRESS",
  "ISSUER_ADDRESS",
]);

export function loadDeploymentRuntime(
  filePath = process.env.DEPLOYMENT_RUNTIME_PATH || "/run/pramaan/runtime.env",
) {
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`Invalid deployment runtime line: ${line}`);
    const name = line.slice(0, separator);
    const value = line.slice(separator + 1);
    if (!allowed.has(name)) {
      throw new Error(`Unexpected deployment runtime variable: ${name}`);
    }
    if (process.env[name] && process.env[name] !== value) {
      throw new Error(`Deployment runtime conflicts with ${name}`);
    }
    process.env[name] = value;
  }

  for (const required of [
    "BLOCKCHAIN_CHAIN_ID",
    "PRAMAAN_CHAIN_ADDRESS",
    "PRAMAAN_CHAIN_START_BLOCK",
  ]) {
    if (!process.env[required]?.trim()) {
      throw new Error(`${required} is missing from deployment runtime`);
    }
  }
}
