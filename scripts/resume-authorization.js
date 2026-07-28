import { network } from "hardhat";
import { assessAuthorizationRecovery, assertAuthorizationRetryConfirmed } from "./authorization-recovery.js";
import { validateExactDeployment } from "./deployment-validation.js";
import { assertExpectedChainId } from "./network-safety.js";
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

if (state.sourceCommit !== sourceCommit) {
  throw new Error("Deployment evidence belongs to a different source commit");
}
if (!state.contractAddress || state.deploymentBlockNumber === undefined) {
  throw new Error("No confirmed deployment is available to resume");
}
if (!state.transactions?.deployment) {
  throw new Error("Deployment evidence does not contain its transaction hash");
}

function latestAttempt() {
  if (Array.isArray(state.authorizationAttempts) && state.authorizationAttempts.length > 0) {
    return state.authorizationAttempts.at(-1);
  }
  return {
    hash: state.transactions?.issuerAuthorization,
    nonce: state.authorizationNonce,
    status: "LEGACY",
  };
}

function recordBlocked(status, reason) {
  state.status = status;
  state.error = reason;
  writeEvidence(evidenceFile, state);
  throw new Error(reason);
}

try {
  const { ethers, networkName } = await network.create();
  const [administratorSigner, issuerSigner] = await ethers.getSigners();
  if (!administratorSigner || !issuerSigner) {
    throw new Error("Distinct administrator and issuer signers are required");
  }

  const administrator = await administratorSigner.getAddress();
  const issuer = await issuerSigner.getAddress();
  const chain = await ethers.provider.getNetwork();
  assertExpectedChainId(networkName, chain.chainId);

  const metadata = normalizeDeploymentMetadata({
    chainId: chain.chainId.toString(),
    contractAddress: state.contractAddress,
    deploymentBlockNumber: state.deploymentBlockNumber,
    administrator: state.administrator,
    issuer: state.issuer,
  });
  if (administrator.toLowerCase() !== metadata.administrator.toLowerCase()) {
    throw new Error("Configured administrator does not match deployment evidence");
  }
  if (issuer.toLowerCase() !== metadata.issuer.toLowerCase()) {
    throw new Error("Configured issuer does not match deployment evidence");
  }

  const validation = await validateExactDeployment({
    provider: ethers.provider,
    metadata,
    deploymentTransactionHash: state.transactions.deployment,
  });
  if (
    state.deployedBytecodeHash
    && state.deployedBytecodeHash !== validation.deployedBytecodeHash
  ) {
    throw new Error("Recorded deployed-bytecode hash does not match live bytecode");
  }
  state.deployedBytecodeHash = validation.deployedBytecodeHash;

  const contract = validation.contract.connect(administratorSigner);
  const attempt = latestAttempt();
  const issuerAuthorized = await contract.isAuthorizedIssuer(issuer);
  const receipt = attempt.hash
    ? await ethers.provider.getTransactionReceipt(attempt.hash)
    : null;
  const transaction = attempt.hash && !receipt
    ? await ethers.provider.getTransaction(attempt.hash)
    : null;
  const latestAdministratorNonce = await ethers.provider.getTransactionCount(
    administrator,
    "latest",
  );
  const assessment = assessAuthorizationRecovery({
    issuerAuthorized,
    recordedHash: attempt.hash,
    recordedNonce: attempt.nonce,
    receipt,
    transaction,
    latestAdministratorNonce,
  });

  if (assessment.action === "BLOCK_PENDING") {
    recordBlocked("AUTHORIZATION_PENDING", assessment.reason);
  }
  if (assessment.action === "BLOCK_AMBIGUOUS") {
    recordBlocked("AUTHORIZATION_AMBIGUOUS", assessment.reason);
  }
  if (assessment.action === "BLOCK_INCONSISTENT") {
    recordBlocked("AUTHORIZATION_INCONSISTENT", assessment.reason);
  }

  if (assessment.action === "RETRY_SAFE") {
    attempt.status = receipt?.status === 0 ? "FAILED" : "NONCE_CONSUMED";
    attempt.receiptStatus = receipt?.status;
    attempt.blockNumber = receipt?.blockNumber;
    state.status = "AUTHORIZATION_RETRY_REQUIRED";
    state.error = assessment.reason;
    writeEvidence(evidenceFile, state);

    assertAuthorizationRetryConfirmed({
      allowRetry: process.env.ALLOW_AUTHORIZATION_RESUBMIT === "true",
      confirmation: process.env.AUTHORIZATION_RETRY_CONFIRMATION,
      recordedHash: attempt.hash,
    });

    const retryNonce = await administratorSigner.getNonce("pending");
    const retryAttempt = { nonce: retryNonce, status: "PREPARED" };
    state.authorizationAttempts = [
      ...(state.authorizationAttempts || [attempt]),
      retryAttempt,
    ];
    state.authorizationNonce = retryNonce;
    state.status = "AUTHORIZATION_PREPARED";
    delete state.error;
    writeEvidence(evidenceFile, state);

    const retryTransaction = await contract.authorizeIssuer(
      issuer,
      { nonce: retryNonce },
    );
    Object.assign(retryAttempt, {
      hash: retryTransaction.hash,
      status: "SUBMITTED",
    });
    state.transactions.issuerAuthorization = retryTransaction.hash;
    state.status = "AUTHORIZATION_SUBMITTED";
    writeEvidence(evidenceFile, state);

    const retryReceipt = await retryTransaction.wait();
    Object.assign(retryAttempt, {
      blockNumber: retryReceipt?.blockNumber,
      receiptStatus: retryReceipt?.status,
      status: retryReceipt?.status === 1 ? "CONFIRMED" : "FAILED",
    });
    writeEvidence(evidenceFile, state);
    if (retryReceipt === null || retryReceipt.status !== 1) {
      throw new Error("Issuer authorization retry was not confirmed successfully");
    }
    state.authorizationBlockNumber = retryReceipt.blockNumber;
  }

  if (!await contract.isAuthorizedIssuer(issuer)) {
    throw new Error("Issuer authorization did not become active");
  }

  state.status = "READY";
  delete state.error;
  writeEvidence(evidenceFile, state);
  writeRuntimeEnv(runtimeFile, metadata);
  console.log(JSON.stringify({ ...metadata, status: state.status }, null, 2));
} catch (error) {
  const cleanError = sanitizedError(error);
  if (!String(state.status).startsWith("AUTHORIZATION_")) {
    state.status = "FAILED";
  }
  state.error = cleanError.message;
  writeEvidence(evidenceFile, state);
  throw cleanError;
}
