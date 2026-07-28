import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadDeploymentRuntime } from "./load-runtime-env.js";

loadDeploymentRuntime();

for (const name of ["PRAMAAN_CHAIN_ADDRESS", "BLOCKCHAIN_CHAIN_ID"]) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is required; configure a deployment before startup`);
  }
}

const dataDirectory = path.resolve(process.env.DATABASE_PATH || ".data/pramaan-app.sqlite", "..");
const keyPath = path.join(dataDirectory, "application-encryption-key");

fs.mkdirSync(dataDirectory, { recursive: true });

if (!process.env.APP_DATA_ENCRYPTION_KEY) {
  if (!fs.existsSync(keyPath)) {
    fs.writeFileSync(keyPath, `${randomBytes(32).toString("base64")}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
  }
  process.env.APP_DATA_ENCRYPTION_KEY = fs.readFileSync(keyPath, "utf8").trim();
}

const { start } = await import("./src/server.js");
const { server, db } = await start();

async function shutdown(signal) {
  console.log(`Received ${signal}; stopping application backend`);
  await new Promise((resolve) => server.close(resolve));
  db.close();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
