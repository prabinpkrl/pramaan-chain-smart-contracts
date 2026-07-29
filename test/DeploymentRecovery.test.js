import assert from "node:assert/strict";
import { assessDeploymentRecovery } from "../scripts/deployment-recovery.js";

const hash = `0x${"ab".repeat(32)}`;

describe("contract-deployment recovery", () => {
  it("finalizes a successful contract-creation receipt", () => {
    const result = assessDeploymentRecovery({
      recordedHash: hash,
      recordedNonce: 7,
      receipt: {
        status: 1,
        contractAddress: "0x0000000000000000000000000000000000000001",
      },
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "FINALIZE");
  });

  it("records a definitely failed deployment without retrying it", () => {
    const result = assessDeploymentRecovery({
      recordedHash: hash,
      recordedNonce: 7,
      receipt: { status: 0, contractAddress: null },
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "FAILED");
  });

  it("blocks while the recorded deployment remains pending", () => {
    const result = assessDeploymentRecovery({
      recordedHash: hash,
      recordedNonce: 7,
      receipt: null,
      transaction: { hash, nonce: 7 },
      latestAdministratorNonce: 7,
    });
    assert.equal(result.action, "BLOCK_PENDING");
  });

  it("blocks an unavailable transaction even when its nonce was consumed", () => {
    const result = assessDeploymentRecovery({
      recordedHash: hash,
      recordedNonce: 7,
      receipt: null,
      transaction: null,
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "BLOCK_AMBIGUOUS");
    assert.match(result.reason, /nonce was consumed/u);
  });

  it("blocks evidence without a transaction hash or nonce", () => {
    assert.equal(
      assessDeploymentRecovery({
        recordedNonce: 7,
        latestAdministratorNonce: 7,
      }).action,
      "BLOCK_AMBIGUOUS",
    );
    assert.equal(
      assessDeploymentRecovery({
        recordedHash: hash,
        latestAdministratorNonce: 7,
      }).action,
      "BLOCK_AMBIGUOUS",
    );
  });

  it("blocks an inconsistent successful receipt without a contract address", () => {
    const result = assessDeploymentRecovery({
      recordedHash: hash,
      recordedNonce: 7,
      receipt: { status: 1, contractAddress: null },
      latestAdministratorNonce: 8,
    });
    assert.equal(result.action, "BLOCK_INCONSISTENT");
  });
});
