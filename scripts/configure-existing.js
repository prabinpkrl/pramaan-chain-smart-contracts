import { JsonRpcProvider } from "ethers";
import { validateExactDeployment } from "./deployment-validation.js";
import {
  assertRuntimeWritable,
  evidencePath,
  normalizeDeploymentMetadata,
  runtimePath,
  sanitizedError,
  validatedSourceCommit,
  writeEvidence,
  writeRuntimeEnv,
} from "./deployment-runtime.js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const runtimeFile = runtimePath();
const evidenceFile = evidencePath();
const overwriteRuntime = process.env.ALLOW_RUNTIME_OVERWRITE === "true";
assertRuntimeWritable(runtimeFile, { overwrite: overwriteRuntime });
const sourceCommit = validatedSourceCommit();

const state = {
  operation: "IMPORT_EXISTING",
  status: "VALIDATING",
  sourceCommit,
};
writeEvidence(evidenceFile, state);

try {
  const metadata = normalizeDeploymentMetadata({
    chainId: process.env.BLOCKCHAIN_CHAIN_ID || "11155111",
    contractAddress: required("IMPORT_CONTRACT_ADDRESS"),
    deploymentBlockNumber: required("IMPORT_DEPLOYMENT_BLOCK"),
    administrator: required("IMPORT_ADMINISTRATOR_ADDRESS"),
  });

  const provider = new JsonRpcProvider(
    required("SEPOLIA_RPC_URL"),
    undefined,
    { batchMaxCount: 1 },
  );
  const network = await provider.getNetwork();
  if (network.chainId.toString() !== metadata.chainId) {
    throw new Error(
      `Incorrect chain ID: expected ${metadata.chainId}, got ${network.chainId}`,
    );
  }

  const { deploymentReceipt, deployedBytecodeHash } =
    await validateExactDeployment({ provider, metadata });

  Object.assign(state, metadata, {
    status: "READY",
    transactions: { deployment: deploymentReceipt.hash },
    deployedBytecodeHash,
    sourceVerification: { status: "UNKNOWN" },
  });
  writeEvidence(evidenceFile, state);
  writeRuntimeEnv(runtimeFile, metadata, {
    overwrite: overwriteRuntime,
  });
  console.log(JSON.stringify({ ...metadata, status: state.status }, null, 2));
} catch (error) {
  const cleanError = sanitizedError(error);
  state.status = "FAILED";
  state.error = cleanError.message;
  writeEvidence(evidenceFile, state);
  throw cleanError;
}
