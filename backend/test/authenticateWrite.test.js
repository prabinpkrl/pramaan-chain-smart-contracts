import assert from "node:assert/strict";
import test from "node:test";
import { authenticateWrite } from "../src/middleware/authenticateWrite.js";

function callMiddleware(apiKey) {
  const request = {
    get(name) {
      return name === "x-api-key" ? apiKey : undefined;
    },
  };
  let nextValue;
  authenticateWrite(request, {}, (value) => {
    nextValue = value;
  });
  return nextValue;
}

test("write authentication is disabled securely without configuration", () => {
  delete process.env.WRITE_API_KEY;
  const error = callMiddleware();
  assert.equal(error.status, 503);
  assert.equal(error.code, "WRITE_AUTH_NOT_CONFIGURED");
});

test("write authentication rejects an invalid key", () => {
  process.env.WRITE_API_KEY = "correct-secret";
  const error = callMiddleware("wrong-secret");
  assert.equal(error.status, 401);
  assert.equal(error.code, "INVALID_API_KEY");
});

test("write authentication accepts the configured key", () => {
  process.env.WRITE_API_KEY = "correct-secret";
  assert.equal(callMiddleware("correct-secret"), undefined);
  delete process.env.WRITE_API_KEY;
});
