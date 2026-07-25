import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/server.js";

async function withServer(run) {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));

  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

test("certificate summary route is not captured as a document hash", async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/certificates/summary`);
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "CERTIFICATE_INDEX_NOT_READY");
  });
});

test("write routes fail closed when API authentication is not configured", async () => {
  delete process.env.WRITE_API_KEY;
  delete process.env.CORS_ALLOWED_ORIGINS;

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/write/issue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentHash: `0x${"11".repeat(32)}` }),
    });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "WRITE_AUTH_NOT_CONFIGURED");
  });
});

test("unapproved browser origins are rejected", async () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://allowed.example";

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: "https://denied.example" },
    });
    const body = await response.json();

    assert.equal(response.status, 403);
    assert.equal(body.error.code, "CORS_ORIGIN_DENIED");
  });

  delete process.env.CORS_ALLOWED_ORIGINS;
});

test("pagination rejects partially numeric values", async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;

  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/certificates?page=1invalid`,
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "INVALID_PAGINATION");
  });
});
