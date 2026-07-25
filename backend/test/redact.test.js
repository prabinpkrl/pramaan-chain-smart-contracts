import assert from "node:assert/strict";
import test from "node:test";
import { redactSecrets } from "../src/utils/redact.js";

test("redactSecrets removes configured credentials from messages", () => {
  process.env.SEPOLIA_RPC_URL = "https://rpc.example/private-token";
  process.env.WRITE_API_KEY = "write-secret";

  const result = redactSecrets(
    "failed https://rpc.example/private-token with write-secret",
  );

  assert.equal(result.includes("private-token"), false);
  assert.equal(result.includes("write-secret"), false);
  assert.equal(result, "failed [REDACTED] with [REDACTED]");

  delete process.env.SEPOLIA_RPC_URL;
  delete process.env.WRITE_API_KEY;
});
