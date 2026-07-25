import assert from "node:assert/strict";
import test from "node:test";
import { loadAbi } from "../src/services/blockchain.js";

test("backend ABI loads from the actual committed location", () => {
  const backendAbi = loadAbi();
  const names = new Set(backendAbi.map((entry) => entry.name).filter(Boolean));

  assert.equal(Array.isArray(backendAbi), true);
  for (const name of [
    "issueCertificate",
    "verifyCertificate",
    "getCertificate",
    "revokeCertificate",
    "CertificateIssued",
    "CertificateRevoked",
  ]) {
    assert.equal(names.has(name), true, `ABI is missing ${name}`);
  }
});
