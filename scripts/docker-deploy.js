import { spawnSync } from "node:child_process";
import {
  evidencePath,
  readEvidence,
  readRuntimeEnv,
  redactError,
  runtimePath,
  writeEvidence,
} from "./deployment-runtime.js";

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: capture ? "utf8" : undefined,
    env: process.env,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  return result;
}

for (const [command, args] of [
  ["npm", ["run", "compile", "--", "--build-profile", "production"]],
  ["npm", ["test"]],
  ["npm", ["run", "sepolia:deploy"]],
]) {
  const result = run(command, args);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const runtimeFile = runtimePath();
const evidenceFile = evidencePath();
const metadata = readRuntimeEnv(runtimeFile);
const evidence = readEvidence(evidenceFile);

const keyList = run("npx", ["hardhat", "keystore", "list"], { capture: true });
const etherscanConfigured = keyList.status === 0
  && keyList.stdout.includes("ETHERSCAN_API_KEY");

if (!etherscanConfigured) {
  evidence.sourceVerification = {
    status: "SKIPPED",
    message: "ETHERSCAN_API_KEY is not configured in the encrypted keystore",
  };
  writeEvidence(evidenceFile, evidence);
  console.log(
    "Deployment is ready. Source verification was skipped because "
    + "ETHERSCAN_API_KEY is not configured.",
  );
  process.exit(0);
}

const verification = run("npm", [
  "run",
  "sepolia:verify",
  "--",
  metadata.contractAddress,
]);

if (verification.status === 0) {
  evidence.sourceVerification = { status: "VERIFIED" };
  writeEvidence(evidenceFile, evidence);
  process.exit(0);
}

evidence.sourceVerification = {
  status: "FAILED",
  message: redactError("Etherscan verification command failed"),
};
writeEvidence(evidenceFile, evidence);
console.error(
  "The contract remains deployed and configured, but source verification failed. "
  + "Rerun the verification-only command; do not redeploy.",
);
process.exit(verification.status ?? 1);
