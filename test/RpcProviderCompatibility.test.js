import assert from "node:assert/strict";
import fs from "node:fs";

describe("public Sepolia RPC compatibility", () => {
  it("disables JSON-RPC batching in every ethers HTTP client", () => {
    for (const sourcePath of [
      "backend/src/services/blockchain.js",
      "app-backend/src/blockchain.js",
      "scripts/configure-existing.js",
      "scripts/index.js",
    ]) {
      const source = fs.readFileSync(sourcePath, "utf8");
      assert.match(
        source,
        /batchMaxCount:\s*1/u,
        `${sourcePath} must remain compatible with free RPC batch limits`,
      );
    }
  });
});
