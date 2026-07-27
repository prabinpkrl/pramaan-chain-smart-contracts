import "dotenv/config";
import { pathToFileURL } from "node:url";
import { loadConfig } from "./config.js";
import { AppDatabase } from "./database.js";
import { BlockchainService } from "./blockchain.js";
import { createApp } from "./app.js";

export async function start() {
  const config = loadConfig();
  const db = new AppDatabase(config.databasePath, config.encryptionKey);
  const chain = new BlockchainService(config);
  await chain.checkReady();
  const app = createApp({ db, chain, config });
  const server = app.listen(config.port);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  console.log(`PramaanChain application backend listening on ${config.port}`);
  return { server, db };
}

const isEntrypoint = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  start().catch((error) => {
    console.error(`Failed to start application backend: ${error.message}`);
    process.exitCode = 1;
  });
}
