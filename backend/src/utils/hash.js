import { sha256, isHexString, dataLength } from "ethers";

export function hashDocumentBytes(documentBytes) {
  const hash = sha256(documentBytes);
  return hash;
}

export function validateDocumentHash(documentHash) {
  if (!isHexString(documentHash) || dataLength(documentHash) !== 32) {
    throw new Error("documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)");
  }
  return documentHash;
}
