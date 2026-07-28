import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";

const base = {
  APP_DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
  SEPOLIA_RPC_URL: "https://rpc.example",
  PRAMAAN_CHAIN_ADDRESS: "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
};

describe("application backend configuration", () => {
  it("allows insecure cookies only for a local browser origin", () => {
    const config = loadConfig({
      ...base,
      APP_ORIGIN: "http://127.0.0.1:5173",
      COOKIE_SECURE: "false",
    });
    assert.equal(config.cookieSecure, false);
  });

  it("requires secure cookies for a non-local browser origin", () => {
    assert.throws(
      () => loadConfig({
        ...base,
        APP_ORIGIN: "https://demo.example",
        COOKIE_SECURE: "false",
      }),
      /COOKIE_SECURE must be true/,
    );
    assert.equal(loadConfig({
      ...base,
      APP_ORIGIN: "https://demo.example",
      COOKIE_SECURE: "true",
    }).cookieSecure, true);
  });
});
