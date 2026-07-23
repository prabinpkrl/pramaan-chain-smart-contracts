import { getReadContract, getWriteContract, statusToName } from "./blockchain.js";
import { validateDocumentHash } from "../utils/hash.js";

const CONFIRMATIONS = Number(process.env.BLOCKCHAIN_CONFIRMATIONS || "2");

async function waitForReceipt(transactionPromise) {
  const transaction = await transactionPromise;
  const receipt = await transaction.wait(CONFIRMATIONS);

  if (receipt === null || receipt.status !== 1) {
    throw new Error(`Blockchain transaction failed: ${transaction.hash}`);
  }

  return {
    transactionHash: receipt.hash,
    blockNumber: Number(receipt.blockNumber),
  };
}

export async function verifyCertificate(documentHash) {
  validateDocumentHash(documentHash);
  const contract = getReadContract();

  const statusValue = await contract.verifyCertificate(documentHash);
  const status = statusToName(statusValue);

  const record = await contract.getCertificate(documentHash);

  return {
    documentHash,
    status,
    issuer: record.issuer,
    issuedAt: Number(record.issuedAt),
    revokedAt: Number(record.revokedAt),
  };
}

export async function getCertificate(documentHash) {
  validateDocumentHash(documentHash);
  const contract = getReadContract();

  const record = await contract.getCertificate(documentHash);
  const status = statusToName(record.status);

  return {
    documentHash,
    status,
    issuer: record.issuer,
    issuedAt: Number(record.issuedAt),
    revokedAt: Number(record.revokedAt),
  };
}

export async function issueCertificate(documentHash) {
  validateDocumentHash(documentHash);
  const contract = getReadContract();
  const writeContract = getWriteContract();

  const receipt = await waitForReceipt(
    writeContract.issueCertificate(documentHash),
  );

  const status = await contract.verifyCertificate(documentHash);
  if (status !== 1n) {
    throw new Error("Issued certificate did not resolve to ACTIVE");
  }

  return {
    ...receipt,
    documentHash,
    status: "ACTIVE",
  };
}

export async function revokeCertificate(documentHash) {
  validateDocumentHash(documentHash);
  const contract = getReadContract();
  const writeContract = getWriteContract();

  const record = await contract.getCertificate(documentHash);
  const { getIssuerAddress } = await import("./blockchain.js");
  const signerAddress = getIssuerAddress();

  if (record.issuer.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("Configured signer is not the original certificate issuer");
  }

  const receipt = await waitForReceipt(
    writeContract.revokeCertificate(documentHash),
  );

  const status = await contract.verifyCertificate(documentHash);
  if (status !== 2n) {
    throw new Error("Revoked certificate did not resolve to REVOKED");
  }

  return {
    ...receipt,
    documentHash,
    status: "REVOKED",
  };
}

export async function isAuthorizedIssuer(address) {
  const contract = getReadContract();
  const result = await contract.isAuthorizedIssuer(address);
  return { address, authorized: result };
}
