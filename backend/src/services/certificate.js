import {
  getReadContract,
  getWriteContract,
  getIssuerAddress,
  requireAuthorizedIssuer,
  statusToName,
} from "./blockchain.js";
import {
  validateDocumentHash,
  validateIssuableDocumentHash,
} from "../utils/hash.js";
import { addRecord, updateRecordStatus } from "./certificateIndex.js";
import { getBlockchainConfig } from "../config.js";
import {
  HttpError,
  conflict,
  forbidden,
  notFound,
} from "../utils/httpError.js";

let writeQueue = Promise.resolve();

function serializeWrite(operation) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.catch(() => undefined);
  return result;
}

function findRevertData(error) {
  return error?.data
    || error?.error?.data
    || error?.info?.error?.data
    || error?.info?.data;
}

export function mapContractError(error) {
  if (error instanceof HttpError) return error;

  const contract = getReadContract();
  let errorName = error?.revert?.name || error?.errorName;
  const revertData = findRevertData(error);

  if (!errorName && typeof revertData === "string") {
    try {
      errorName = contract.interface.parseError(revertData)?.name;
    } catch {
      // Preserve the safe generic mapping below.
    }
  }

  const mappings = {
    InvalidDocumentHash: [400, "ZERO_DOCUMENT_HASH", "The zero document hash cannot be issued"],
    CertificateAlreadyExists: [409, "CERTIFICATE_ALREADY_EXISTS", "Certificate hash has already been issued"],
    CertificateNotFound: [404, "CERTIFICATE_NOT_FOUND", "Certificate does not exist"],
    CertificateAlreadyRevoked: [409, "CERTIFICATE_ALREADY_REVOKED", "Certificate is already revoked"],
    UnauthorizedRevoker: [403, "UNAUTHORIZED_REVOKER", "Configured signer cannot revoke this certificate"],
    AccessControlUnauthorizedAccount: [403, "ISSUER_NOT_AUTHORIZED", "Configured issuer is not authorized"],
  };

  const mapping = mappings[errorName];
  if (mapping) return new HttpError(...mapping);

  return new HttpError(
    502,
    "BLOCKCHAIN_OPERATION_FAILED",
    "Blockchain operation failed",
  );
}

async function waitForReceipt(transactionPromise) {
  const { confirmations } = getBlockchainConfig();
  const transaction = await transactionPromise;
  const receipt = await transaction.wait(confirmations);

  if (receipt === null || receipt.status !== 1) {
    throw new HttpError(
      502,
      "BLOCKCHAIN_TRANSACTION_FAILED",
      "Blockchain transaction did not confirm successfully",
      { transactionHash: transaction.hash },
    );
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
  validateIssuableDocumentHash(documentHash);

  return serializeWrite(async () => {
    const contract = getReadContract();
    const writeContract = getWriteContract();
    await requireAuthorizedIssuer();

    const existingStatus = await contract.verifyCertificate(documentHash);
    if (existingStatus !== 0n) {
      throw conflict(
        "CERTIFICATE_ALREADY_EXISTS",
        "Certificate hash has already been issued",
      );
    }

    try {
      const receipt = await waitForReceipt(
        writeContract.issueCertificate(documentHash),
      );

      const record = await contract.getCertificate(documentHash);
      if (record.status !== 1n) {
        throw new HttpError(
          502,
          "POST_WRITE_STATE_MISMATCH",
          "Issued certificate did not resolve to ACTIVE",
        );
      }

      const indexedRecord = {
        documentHash,
        status: "ACTIVE",
        issuer: record.issuer,
        issuedAt: Number(record.issuedAt),
        revokedAt: Number(record.revokedAt),
        issueTxHash: receipt.transactionHash,
        issueBlockNumber: receipt.blockNumber,
        revokeTxHash: null,
        revokeBlockNumber: null,
        revokedBy: null,
      };
      addRecord(documentHash, indexedRecord);

      return {
        ...receipt,
        documentHash,
        status: "ACTIVE",
        issuer: record.issuer,
        issuedAt: Number(record.issuedAt),
      };
    } catch (error) {
      throw mapContractError(error);
    }
  });
}

export async function revokeCertificate(documentHash) {
  validateDocumentHash(documentHash);

  return serializeWrite(async () => {
    const contract = getReadContract();
    const writeContract = getWriteContract();
    const record = await contract.getCertificate(documentHash);
    const signerAddress = getIssuerAddress();

    if (record.status === 0n) {
      throw notFound(
        "CERTIFICATE_NOT_FOUND",
        "Certificate does not exist",
      );
    }
    if (record.status === 2n) {
      throw conflict(
        "CERTIFICATE_ALREADY_REVOKED",
        "Certificate is already revoked",
      );
    }
    if (record.issuer.toLowerCase() !== signerAddress.toLowerCase()) {
      throw forbidden(
        "UNAUTHORIZED_REVOKER",
        "Configured signer is not the original certificate issuer",
      );
    }

    try {
      const receipt = await waitForReceipt(
        writeContract.revokeCertificate(documentHash),
      );

      const confirmedRecord = await contract.getCertificate(documentHash);
      if (confirmedRecord.status !== 2n) {
        throw new HttpError(
          502,
          "POST_WRITE_STATE_MISMATCH",
          "Revoked certificate did not resolve to REVOKED",
        );
      }

      updateRecordStatus(documentHash, {
        status: "REVOKED",
        revokedAt: Number(confirmedRecord.revokedAt),
        revokeTxHash: receipt.transactionHash,
        revokeBlockNumber: receipt.blockNumber,
        revokedBy: signerAddress,
      });

      return {
        ...receipt,
        documentHash,
        status: "REVOKED",
        revokedAt: Number(confirmedRecord.revokedAt),
        revokedBy: signerAddress,
      };
    } catch (error) {
      throw mapContractError(error);
    }
  });
}

export async function isAuthorizedIssuer(address) {
  const contract = getReadContract();
  const result = await contract.isAuthorizedIssuer(address);
  return { address, authorized: result };
}
