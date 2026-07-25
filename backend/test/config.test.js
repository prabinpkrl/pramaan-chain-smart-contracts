import assert from "node:assert/strict";
import test from "node:test";
import { getTrustProxy } from "../src/config.js";

test.afterEach(() => {
  delete process.env.TRUST_PROXY;
});

test("proxy trust is disabled by default", () => {
  delete process.env.TRUST_PROXY;
  assert.equal(getTrustProxy(), false);
});

test("proxy trust accepts an exact hop count", () => {
  process.env.TRUST_PROXY = "1";
  assert.equal(getTrustProxy(), 1);
});

test("proxy trust rejects permissive true configuration", () => {
  process.env.TRUST_PROXY = "true";
  assert.throws(
    () => getTrustProxy(),
    /TRUST_PROXY must be false or an integer from 1 to 10/,
  );
});
