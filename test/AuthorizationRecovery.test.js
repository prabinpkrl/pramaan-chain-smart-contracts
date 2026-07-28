import assert from "node:assert/strict";
import {
  assessAuthorizationRecovery,
  assertAuthorizationRetryConfirmed,
} from "../scripts/authorization-recovery.js";

const hash = `0x${"ab".repeat(32)}`;

describe("issuer-authorization recovery", () => {
  it("finalizes an already-active issuer without another transaction", () => {
    assert.deepEqual(
      assessAuthorizationRecovery({ issuerAuthorized: true }),
      { action: "FINALIZE", reason: "Issuer authorization is active" },
    );
  });

  it("blocks while the recorded transaction remains pending", () => {
    const result = assessAuthorizationRecovery({
      issuerAuthorized: false,
      recordedHash: hash,
      recordedNonce: 7,
      receipt: null,
      transaction: { hash, nonce: 7 },
      latestAdministratorNonce: 7,
    });
    assert.equal(result.action, "BLOCK_PENDING");
  });

  it("blocks an absent transaction whose nonce is not consumed", () => {
    const result = assessAuthorizationRecovery({
      issuerAuthorized: false,
      recordedHash: hash,
      recordedNonce: 7,
      receipt: null,
      transaction: null,
      latestAdministratorNonce: 7,
    });
    assert.equal(result.action, "BLOCK_AMBIGUOUS");
  });

  it("permits a deliberate retry only after a failed receipt", () => {
    const result = assessAuthorizationRecovery({
      issuerAuthorized: false,
      recordedHash: hash,
      recordedNonce: 7,
      receipt: { status: 0, blockNumber: 100 },
      transaction: null,
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "RETRY_SAFE");
    assert.throws(
      () => assertAuthorizationRetryConfirmed({
        allowRetry: false,
        confirmation: hash,
        recordedHash: hash,
      }),
      /disabled/,
    );
    assert.doesNotThrow(
      () => assertAuthorizationRetryConfirmed({
        allowRetry: true,
        confirmation: hash,
        recordedHash: hash,
      }),
    );
    assert.throws(
      () => assertAuthorizationRetryConfirmed({
        allowRetry: true,
        confirmation: `0x${"cd".repeat(32)}`,
        recordedHash: hash,
      }),
      /must equal the recorded transaction hash/,
    );
  });

  it("permits retry when the missing transaction nonce is already consumed", () => {
    const result = assessAuthorizationRecovery({
      issuerAuthorized: false,
      recordedHash: hash,
      recordedNonce: 7,
      receipt: null,
      transaction: null,
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "RETRY_SAFE");
  });

  it("blocks a successful receipt when the issuer role is unexpectedly absent", () => {
    const result = assessAuthorizationRecovery({
      issuerAuthorized: false,
      recordedHash: hash,
      recordedNonce: 7,
      receipt: { status: 1, blockNumber: 100 },
      transaction: null,
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "BLOCK_INCONSISTENT");
  });
});
