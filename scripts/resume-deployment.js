import { network } from "hardhat";
import { assessDeploymentRecovery } from "./deployment-recovery.js";
import { assertExpectedChainId } from "./network-safety.js";
import { validateExactDeployment } from "./deployment-validation.js";
import {
  assertRuntimeWritable,
  evidencePath,
  normalizeDeploymentMetadata,
  readEvidence,
  runtimePath,
  sanitizedError,
  validatedSourceCommit,
  writeEvidence,
  writeRuntimeEnv,
} from "./deployment-runtime.js";

const evidenceFile = evidencePath();
const runtimeFile = runtimePath();
assertRuntimeWritable(runtimeFile);
const state = readEvidence(evidenceFile);
const sourceCommit = validatedSourceCommit();

if (state.operation !== "DEPLOY_CONTRACT") {
  throw new Error("Deployment evidence is not an admin-only contract deployment");
}
if (state.sourceCommit !== sourceCommit) {
  throw new Error("Deployment evidence belongs to a different source commit");
}
if (!state.administrator) {
  throw new Error("Deployment evidence does not contain the administrator address");
}

function block(status, reason) {
  state.status = status;
  state.error = reason;
  writeEvidence(evidenceFile, state);
  throw new Error(reason);
}

try {
  const { ethers, networkName } = await network.create();
  const chain = await ethers.provider.getNetwork();
  assertExpectedChainId(networkName, chain.chainId);

  const deploymentHash = state.transactions?.deployment;
  const receipt = deploymentHash
    ? await ethers.provider.getTransactionReceipt(deploymentHash)
    : null;
  const transaction = deploymentHash && !receipt
    ? await ethers.provider.getTransaction(deploymentHash)
    : null;
  const latestAdministratorNonce = await ethers.provider.getTransactionCount(
    state.administrator,
    "latest",
  );
  const assessment = assessDeploymentRecovery({
    recordedHash: deploymentHash,
    recordedNonce: state.deploymentNonce,
    receipt,
    transaction,
    latestAdministratorNonce,
  });

  if (assessment.action === "BLOCK_PENDING") {
    block("DEPLOYMENT_PENDING", assessment.reason);
  }
  if (assessment.action === "BLOCK_AMBIGUOUS") {
    block("DEPLOYMENT_AMBIGUOUS", assessment.reason);
  }
  if (assessment.action === "BLOCK_INCONSISTENT") {
    block("DEPLOYMENT_INCONSISTENT", assessment.reason);
  }
  if (assessment.action === "FAILED") {
    block("DEPLOYMENT_FAILED", assessment.reason);
  }

  const metadata = normalizeDeploymentMetadata({
    chainId: chain.chainId.toString(),
    contractAddress: receipt.contractAddress,
    deploymentBlockNumber: receipt.blockNumber,
    administrator: state.administrator,
  });
  const validation = await validateExactDeployment({
    provider: ethers.provider,
    metadata,
    deploymentTransactionHash: deploymentHash,
  });

  Object.assign(state, metadata, {
    status: "READY",
    deployedBytecodeHash: validation.deployedBytecodeHash,
  });
  delete state.error;
  writeEvidence(evidenceFile, state);
  writeRuntimeEnv(runtimeFile, metadata);
  console.log(JSON.stringify({ ...metadata, status: state.status }, null, 2));
} catch (error) {
  const cleanError = sanitizedError(error);
  if (!String(state.status).startsWith("DEPLOYMENT_")) {
    state.status = "FAILED";
  }
  state.error = cleanError.message;
  writeEvidence(evidenceFile, state);
  throw cleanError;
}
