import { sha256, isHexString, dataLength } from "ethers";
import { badRequest } from "./httpError.js";

const ZERO_HASH = `0x${"00".repeat(32)}`;

export function hashDocumentBytes(documentBytes) {
  const hash = sha256(documentBytes);
  return hash;
}

export function validateDocumentHash(documentHash) {
  if (!isHexString(documentHash) || dataLength(documentHash) !== 32) {
    throw badRequest(
      "INVALID_DOCUMENT_HASH",
      "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)",
    );
  }
  return documentHash;
}

export function validateIssuableDocumentHash(documentHash) {
  validateDocumentHash(documentHash);
  if (documentHash.toLowerCase() === ZERO_HASH) {
    throw badRequest(
      "ZERO_DOCUMENT_HASH",
      "The zero document hash cannot be issued",
    );
  }
  return documentHash;
}
