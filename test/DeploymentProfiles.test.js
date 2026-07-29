import assert from "node:assert/strict";
import hardhatConfig from "../hardhat.config.js";

describe("Sepolia signer profiles", () => {
  it("keeps verification read-only", () => {
    assert.deepEqual(hardhatConfig.networks.sepolia.accounts, []);
  });

  it("requires only the administrator for normal deployment", () => {
    assert.deepEqual(
      hardhatConfig.networks["sepolia-admin"].accounts.map(({ name }) => name),
      ["DEPLOYER_PRIVATE_KEY"],
    );
  });

  it("isolates the issuer key to the optional lifecycle demo", () => {
    assert.deepEqual(
      hardhatConfig.networks["sepolia-demo"].accounts.map(({ name }) => name),
      ["DEPLOYER_PRIVATE_KEY", "ISSUER_PRIVATE_KEY"],
    );
  });
});
