import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertRuntimeWritable,
  normalizeSourceCommit,
  normalizeDeploymentMetadata,
  parseRuntimeEnv,
  readRuntimeEnvIfPresent,
  sanitizedError,
  serializeRuntimeEnv,
  validatedSourceCommit,
  writeRuntimeEnv,
} from "../scripts/deployment-runtime.js";

const valid = {
  chainId: "11155111",
  contractAddress: "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
  deploymentBlockNumber: 11318772,
  administrator: "0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447",
};
const legacyIssuer = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";

describe("Docker deployment runtime metadata", () => {
  it("round-trips validated public deployment values", () => {
    assert.deepEqual(parseRuntimeEnv(serializeRuntimeEnv(valid)), valid);
    assert.doesNotMatch(serializeRuntimeEnv(valid), /ISSUER_ADDRESS/u);
  });

  it("continues to read optional legacy issuer metadata", () => {
    const legacy = { ...valid, issuer: legacyIssuer };
    assert.deepEqual(parseRuntimeEnv(serializeRuntimeEnv(legacy)), legacy);
    assert.match(serializeRuntimeEnv(legacy), new RegExp(`ISSUER_ADDRESS=${legacyIssuer}`, "u"));
  });

  it("rejects non-Sepolia and same-wallet deployment metadata", () => {
    assert.throws(
      () => normalizeDeploymentMetadata({ ...valid, chainId: "31337" }),
      /Sepolia/,
    );
    assert.throws(
      () => normalizeDeploymentMetadata({
        ...valid,
        issuer: valid.administrator,
      }),
      /must be different/,
    );
  });

  it("refuses to overwrite an existing deployment by default", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-runtime-"));
    const runtime = path.join(directory, "runtime.env");
    writeRuntimeEnv(runtime, valid);
    assert.throws(() => writeRuntimeEnv(runtime, valid), /refusing to overwrite/);
    assert.deepEqual(parseRuntimeEnv(fs.readFileSync(runtime, "utf8")), valid);
  });

  it("can check overwrite safety before other import work starts", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-runtime-"));
    const runtime = path.join(directory, "runtime.env");
    fs.writeFileSync(runtime, "existing=true\n");

    assert.throws(() => assertRuntimeWritable(runtime), /refusing to overwrite/);
    assert.doesNotThrow(
      () => assertRuntimeWritable(runtime, { overwrite: true }),
    );
  });

  it("exports null runtime metadata when deployment has not reached READY", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pramaan-runtime-"));
    const runtime = path.join(directory, "missing-runtime.env");

    assert.equal(readRuntimeEnvIfPresent(runtime), null);
  });

  it("requires a full source commit and matches the image revision", () => {
    const commit = "73a711d0694197e70e2c262fffd587183c7414fa";
    assert.equal(normalizeSourceCommit(commit.toUpperCase()), commit);
    assert.equal(validatedSourceCommit({
      SOURCE_COMMIT: commit,
      BUILD_SOURCE_COMMIT: commit,
    }), commit);
    assert.throws(() => normalizeSourceCommit("local"), /40-character/);
    assert.throws(() => normalizeSourceCommit("0".repeat(40)), /nonzero/);
    assert.throws(
      () => validatedSourceCommit({
        SOURCE_COMMIT: commit,
        BUILD_SOURCE_COMMIT: "1".repeat(40),
      }),
      /does not match/,
    );
  });

  it("throws only a sanitized error without URLs or configured secrets", () => {
    const error = sanitizedError(
      new Error("RPC https://user:pass@example.test/v2/token rejected secret-value"),
      {
        SEPOLIA_RPC_URL: "https://user:pass@example.test/v2/token",
        DEPLOYER_PRIVATE_KEY: "secret-value",
      },
    );
    assert.doesNotMatch(error.message, /user|pass|token|secret-value/);
    assert.match(error.message, /REDACTED/);
    assert.equal(error.cause, undefined);
  });
});
