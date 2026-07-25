import assert from "node:assert/strict";
import test from "node:test";
import {
  clearIdempotencyCache,
  runIdempotent,
} from "../src/services/idempotency.js";

test.beforeEach(() => {
  clearIdempotencyCache();
});

test("idempotent operations execute once and replay their result", async () => {
  let calls = 0;
  const request = {
    key: "request-1",
    operation: "issue",
    fingerprint: "hash-1",
    execute: async () => {
      calls += 1;
      return { status: "ACTIVE" };
    },
  };

  const first = await runIdempotent(request);
  const second = await runIdempotent(request);

  assert.equal(calls, 1);
  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.deepEqual(second.value, { status: "ACTIVE" });
});

test("idempotency keys cannot be reused with a different request", async () => {
  await runIdempotent({
    key: "request-1",
    operation: "issue",
    fingerprint: "hash-1",
    execute: async () => ({ status: "ACTIVE" }),
  });

  await assert.rejects(
    runIdempotent({
      key: "request-1",
      operation: "issue",
      fingerprint: "hash-2",
      execute: async () => ({ status: "ACTIVE" }),
    }),
    (error) => error.status === 409 && error.code === "IDEMPOTENCY_KEY_REUSED",
  );
});

test("ambiguous server failures remain associated with their key", async () => {
  let calls = 0;
  const request = {
    key: "request-ambiguous",
    operation: "issue",
    fingerprint: "hash-1",
    execute: async () => {
      calls += 1;
      const error = new Error("RPC response was lost");
      error.status = 502;
      throw error;
    },
  };

  await assert.rejects(runIdempotent(request));
  await assert.rejects(runIdempotent(request));
  assert.equal(calls, 1);
});
