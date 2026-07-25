import assert from "node:assert/strict";
import test from "node:test";
import { submitAndWaitForReceipt } from "../src/services/certificate.js";

test("a failed submission resets the managed nonce", async () => {
  let resets = 0;
  const submissionError = new Error("submission failed");

  await assert.rejects(
    submitAndWaitForReceipt(
      async () => {
        throw submissionError;
      },
      {
        confirmations: 2,
        timeoutMs: 1_000,
        resetNonce: () => {
          resets += 1;
        },
      },
    ),
    submissionError,
  );

  assert.equal(resets, 1);
});

test("an ambiguous confirmation preserves the transaction hash", async () => {
  let resets = 0;
  const transaction = {
    hash: `0x${"12".repeat(32)}`,
    wait: async () => {
      const error = new Error("timed out");
      error.code = "TIMEOUT";
      throw error;
    },
  };

  await assert.rejects(
    submitAndWaitForReceipt(
      async () => transaction,
      {
        confirmations: 2,
        timeoutMs: 1_000,
        resetNonce: () => {
          resets += 1;
        },
      },
    ),
    (error) => (
      error.status === 504
      && error.code === "BLOCKCHAIN_TRANSACTION_STATUS_UNKNOWN"
      && error.details.transactionHash === transaction.hash
    ),
  );

  assert.equal(resets, 0);
});

test("a successfully repriced replacement is accepted", async () => {
  const replacementHash = `0x${"34".repeat(32)}`;
  const transaction = {
    hash: `0x${"12".repeat(32)}`,
    wait: async () => {
      const error = new Error("transaction replaced");
      error.code = "TRANSACTION_REPLACED";
      error.cancelled = false;
      error.receipt = {
        hash: replacementHash,
        blockNumber: 123,
        status: 1,
      };
      throw error;
    },
  };

  const result = await submitAndWaitForReceipt(
    async () => transaction,
    {
      confirmations: 2,
      timeoutMs: 1_000,
      resetNonce: () => {},
    },
  );

  assert.deepEqual(result, {
    transactionHash: replacementHash,
    blockNumber: 123,
  });
});
