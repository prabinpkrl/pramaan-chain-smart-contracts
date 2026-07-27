export function isValidDocumentHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}
