import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "pramaan-app-e2e-"));
const databasePath = path.join(temporaryDirectory, "pramaan-app.sqlite");
const backendDirectory = path.resolve("..", "app-backend");

const child = spawn("npm", ["start"], {
  cwd: backendDirectory,
  env: {
    ...process.env,
    DATABASE_PATH: databasePath,
  },
  stdio: "inherit",
});

let stopping = false;
async function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  child.kill(signal);
  await rm(temporaryDirectory, { recursive: true, force: true });
}

process.on("SIGTERM", () => void stop("SIGTERM"));
process.on("SIGINT", () => void stop("SIGINT"));

child.on("exit", async (code) => {
  await rm(temporaryDirectory, { recursive: true, force: true });
  process.exit(code ?? 1);
});
