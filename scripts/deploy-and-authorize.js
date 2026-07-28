import fs from "node:fs";
import { network } from "hardhat";
import { assertExpectedChainId } from "./network-safety.js";
import { validateExactDeployment } from "./deployment-validation.js";
import {
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

if (fs.existsSync(runtimeFile) && !allowNewDeployment) {
  throw new Error(
    `A configured deployment already exists at ${runtimeFile}. `
    + "Start the application or explicitly select a new deployment.",
  );
}

const state = {
  operation: "DEPLOY_AND_AUTHORIZE",
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
  const signers = await ethers.getSigners();
  if (signers.length < 2) {
    throw new Error("Distinct administrator and issuer signers are required");
  }

  const [administratorSigner, issuerSigner] = signers;
  const administrator = await administratorSigner.getAddress();
  const issuer = await issuerSigner.getAddress();
  const chain = await ethers.provider.getNetwork();

  assertExpectedChainId(networkName, chain.chainId);
  if (administrator.toLowerCase() === issuer.toLowerCase()) {
    throw new Error("Administrator and issuer addresses must be different");
  }

  Object.assign(state, { administrator, issuer });
  writeEvidence(evidenceFile, state);

  const contract = await ethers.deployContract("PramaanChain");
  await contract.waitForDeployment();
  const deploymentTransaction = contract.deploymentTransaction();
  if (deploymentTransaction === null) {
    throw new Error("Deployment transaction was not available");
  }

  state.transactions.deployment = deploymentTransaction.hash;
  state.status = "DEPLOYMENT_SUBMITTED";
  writeEvidence(evidenceFile, state);

  const deploymentReceipt = await deploymentTransaction.wait();
  if (deploymentReceipt === null || deploymentReceipt.status !== 1) {
    throw new Error("Deployment transaction was not confirmed successfully");
  }

  const contractAddress = await contract.getAddress();
  const metadata = normalizeDeploymentMetadata({
    chainId: chain.chainId.toString(),
    contractAddress,
    deploymentBlockNumber: deploymentReceipt.blockNumber,
    administrator,
    issuer,
  });
  const deploymentValidation = await validateExactDeployment({
    provider: ethers.provider,
    metadata,
    deploymentTransactionHash: deploymentTransaction.hash,
  });

  Object.assign(state, metadata, {
    status: "DEPLOYED",
    deployedBytecodeHash: deploymentValidation.deployedBytecodeHash,
  });
  writeEvidence(evidenceFile, state);

  const authorizationNonce = await administratorSigner.getNonce("pending");
  const authorizationAttempt = {
    nonce: authorizationNonce,
    status: "PREPARED",
  };
  state.authorizationAttempts = [authorizationAttempt];
  state.authorizationNonce = authorizationNonce;
  state.status = "AUTHORIZATION_PREPARED";
  writeEvidence(evidenceFile, state);

  const authorizationTransaction = await contract.authorizeIssuer(
    issuer,
    { nonce: authorizationNonce },
  );
  state.transactions.issuerAuthorization = authorizationTransaction.hash;
  Object.assign(authorizationAttempt, {
    hash: authorizationTransaction.hash,
    status: "SUBMITTED",
  });
  state.status = "AUTHORIZATION_SUBMITTED";
  writeEvidence(evidenceFile, state);

  const authorizationReceipt = await authorizationTransaction.wait();
  Object.assign(authorizationAttempt, {
    blockNumber: authorizationReceipt?.blockNumber,
    receiptStatus: authorizationReceipt?.status,
    status: authorizationReceipt?.status === 1 ? "CONFIRMED" : "FAILED",
  });
  writeEvidence(evidenceFile, state);
  if (authorizationReceipt === null || authorizationReceipt.status !== 1) {
    throw new Error("Issuer authorization was not confirmed successfully");
  }
  if (!await contract.isAuthorizedIssuer(issuer)) {
    throw new Error("Issuer authorization did not become active");
  }

  state.status = "READY";
  state.authorizationBlockNumber = authorizationReceipt.blockNumber;
  writeEvidence(evidenceFile, state);
  writeRuntimeEnv(runtimeFile, metadata, { overwrite: allowNewDeployment });

  console.log(JSON.stringify({
    ...metadata,
    transactions: state.transactions,
    status: state.status,
  }, null, 2));
} catch (error) {
  const cleanError = sanitizedError(error);
  state.status = "FAILED";
  state.error = cleanError.message;
  writeEvidence(evidenceFile, state);
  throw cleanError;
}
