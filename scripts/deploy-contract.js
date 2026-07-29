import fs from "node:fs";
import { network } from "hardhat";
import { assertExpectedChainId } from "./network-safety.js";
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

const runtimeFile = runtimePath();
const evidenceFile = evidencePath();
const allowNewDeployment = process.env.ALLOW_NEW_DEPLOYMENT === "true";
const sourceCommit = validatedSourceCommit();

assertRuntimeWritable(runtimeFile, { overwrite: allowNewDeployment });
if (fs.existsSync(evidenceFile) && !allowNewDeployment) {
  throw new Error(
    `Deployment evidence already exists at ${evidenceFile}. `
    + "Export it and resume or import that deployment before creating another.",
  );
}

const state = {
  operation: "DEPLOY_CONTRACT",
  status: "STARTING",
  network: "sepolia",
  chainId: "11155111",
  sourceCommit,
  sourceVerification: { status: "PENDING" },
  transactions: {},
};
writeEvidence(evidenceFile, state);

try {
  const { ethers, networkName } = await network.create();
  const [administratorSigner] = await ethers.getSigners();
  if (!administratorSigner) {
    throw new Error("An administrator signer is required");
  }

  const administrator = await administratorSigner.getAddress();
  const chain = await ethers.provider.getNetwork();
  assertExpectedChainId(networkName, chain.chainId);

  const deploymentNonce = await administratorSigner.getNonce("pending");
  Object.assign(state, {
    administrator,
    deploymentNonce,
    status: "DEPLOYMENT_PREPARED",
  });
  writeEvidence(evidenceFile, state);

  const contract = await ethers.deployContract("PramaanChain", {
    nonce: deploymentNonce,
  });
  const deploymentTransaction = contract.deploymentTransaction();
  if (deploymentTransaction === null) {
    throw new Error("Deployment transaction was not available");
  }

  state.transactions.deployment = deploymentTransaction.hash;
  state.status = "DEPLOYMENT_SUBMITTED";
  writeEvidence(evidenceFile, state);

  const deploymentReceipt = await deploymentTransaction.wait();
  if (deploymentReceipt === null || deploymentReceipt.status !== 1) {
    state.status = "DEPLOYMENT_FAILED";
    writeEvidence(evidenceFile, state);
    throw new Error("Deployment transaction was not confirmed successfully");
  }

  const metadata = normalizeDeploymentMetadata({
    chainId: chain.chainId.toString(),
    contractAddress: await contract.getAddress(),
    deploymentBlockNumber: deploymentReceipt.blockNumber,
    administrator,
  });
  const deploymentValidation = await validateExactDeployment({
    provider: ethers.provider,
    metadata,
    deploymentTransactionHash: deploymentTransaction.hash,
  });

  Object.assign(state, metadata, {
    status: "READY",
    deployedBytecodeHash: deploymentValidation.deployedBytecodeHash,
  });
  writeEvidence(evidenceFile, state);
  writeRuntimeEnv(runtimeFile, metadata, { overwrite: allowNewDeployment });

  console.log(JSON.stringify({
    ...metadata,
    transactions: state.transactions,
    status: state.status,
  }, null, 2));
} catch (error) {
  const cleanError = sanitizedError(error);
  if (!["DEPLOYMENT_FAILED", "READY"].includes(state.status)) {
    state.status = state.transactions.deployment
      ? "DEPLOYMENT_UNRESOLVED"
      : "FAILED";
  }
  state.error = cleanError.message;
  writeEvidence(evidenceFile, state);
  throw cleanError;
}
