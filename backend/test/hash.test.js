import assert from "node:assert/strict";
import test from "node:test";
import {
  hashDocumentBytes,
  validateDocumentHash,
  validateIssuableDocumentHash,
} from "../src/utils/hash.js";

test("hashDocumentBytes calculates SHA-256 over exact bytes", () => {
  assert.equal(
    hashDocumentBytes(new TextEncoder().encode("abc")),
    "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("validateDocumentHash accepts a 32-byte hash", () => {
  const hash = `0x${"11".repeat(32)}`;
  assert.equal(validateDocumentHash(hash), hash);
});

test("validateDocumentHash rejects malformed hashes", () => {
  assert.throws(
    () => validateDocumentHash("0x1234"),
    (error) => error.status === 400 && error.code === "INVALID_DOCUMENT_HASH",
  );
});

test("issuance validation rejects the zero hash", () => {
  assert.throws(
    () => validateIssuableDocumentHash(`0x${"00".repeat(32)}`),
    (error) => error.status === 400 && error.code === "ZERO_DOCUMENT_HASH",
  );
});
