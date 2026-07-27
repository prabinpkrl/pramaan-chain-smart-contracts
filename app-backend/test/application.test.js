import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Wallet, getAddress } from "ethers";
import request from "supertest";
import { AppDatabase } from "../src/database.js";
import { createApp } from "../src/app.js";

const HASH_A = `0x${"11".repeat(32)}`;
const HASH_B = `0x${"22".repeat(32)}`;
const TX_A = `0x${"aa".repeat(32)}`;
const TX_B = `0x${"bb".repeat(32)}`;

class MockChain {
  constructor() {
    this.admins = new Set();
    this.issuers = new Set();
    this.records = new Map();
  }

  normalize(address) {
    return getAddress(address).toLowerCase();
  }

  async checkReady() {
    return {
      chainId: "11155111",
      contractAddress: "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
    };
  }

  async isAdmin(address) {
    return this.admins.has(this.normalize(address));
  }

  async isAuthorizedIssuer(address) {
    return this.issuers.has(this.normalize(address));
  }

  async verifyCertificate(documentHash) {
    return this.records.get(documentHash.toLowerCase()) || {
      documentHash: documentHash.toLowerCase(),
      issuer: "0x0000000000000000000000000000000000000000",
      issuedAt: null,
      revokedAt: null,
      status: "NOT_FOUND",
    };
  }

  async validateIssuance({ transactionHash, documentHash, expectedSender }) {
    const record = {
      documentHash: documentHash.toLowerCase(),
      issuer: getAddress(expectedSender),
      issuedAt: "2026-07-25T00:00:00.000Z",
      revokedAt: null,
      status: "ACTIVE",
      transactionHash: transactionHash.toLowerCase(),
      blockNumber: 1,
    };
    this.records.set(documentHash.toLowerCase(), record);
    return record;
  }

  async validateRevocation({ transactionHash, documentHash, expectedSender }) {
    const existing = await this.verifyCertificate(documentHash);
    assert.equal(existing.issuer, getAddress(expectedSender));
    const record = {
      ...existing,
      status: "REVOKED",
      revokedAt: "2026-07-25T01:00:00.000Z",
      transactionHash: transactionHash.toLowerCase(),
      blockNumber: 2,
    };
    this.records.set(documentHash.toLowerCase(), record);
    return record;
  }
}

async function login(agent, wallet) {
  const nonce = await agent
    .post("/api/auth/nonce")
    .send({ address: wallet.address, role: "ADMIN" })
    .expect(201);
  const signature = await wallet.signMessage(nonce.body.message);
  const verified = await agent
    .post("/api/auth/verify")
    .send({ message: nonce.body.message, signature })
    .expect(200);
  return verified.body;
}

describe("PramaanChain application backend", () => {
  let db;
  let chain;
  let app;
  let issuer;
  let citizen;
  let institution;

  beforeEach(() => {
    db = new AppDatabase(":memory:", randomBytes(32));
    chain = new MockChain();
    issuer = Wallet.createRandom();
    citizen = Wallet.createRandom();
    institution = db.seedInstitution({
      name: "Synthetic University",
      slug: "synthetic-university",
      issuerAddress: issuer.address,
    });
    chain.issuers.add(issuer.address.toLowerCase());
    app = createApp({
      db,
      chain,
      config: {
        appOrigin: "http://localhost:5173",
        siweDomain: "localhost:5173",
        chainId: 11155111,
        nonceTtlMs: 5 * 60 * 1000,
        sessionTtlMs: 8 * 60 * 60 * 1000,
        claimTtlMs: 24 * 60 * 60 * 1000,
        cookieSecure: false,
      },
    });
  });

  afterEach(() => db.close());

  it("derives roles after signature verification and ignores a frontend role", async () => {
    chain.admins.add(issuer.address.toLowerCase());
    const agent = request.agent(app);
    const session = await login(agent, issuer);
    assert.deepEqual(session.roles, ["ADMIN", "ISSUER"]);
    assert.equal(session.issuerMemberships[0].id, institution.id);
  });

  it("does not consume a SIWE nonce when signature verification fails", async () => {
    const agent = request.agent(app);
    const challenge = await agent
      .post("/api/auth/nonce")
      .send({ address: citizen.address })
      .expect(201);
    const wrongSignature = await issuer.signMessage(challenge.body.message);
    await agent
      .post("/api/auth/verify")
      .send({ message: challenge.body.message, signature: wrongSignature })
      .expect(403);

    const correctSignature = await citizen.signMessage(challenge.body.message);
    const verified = await agent
      .post("/api/auth/verify")
      .send({ message: challenge.body.message, signature: correctSignature })
      .expect(200);
    assert.deepEqual(verified.body.roles, ["UNLINKED"]);
  });

  it("rechecks issuer authorization on every protected request", async () => {
    const agent = request.agent(app);
    await login(agent, issuer);
    await agent
      .get(`/api/issuer/requests?institutionId=${institution.id}`)
      .expect(200);

    chain.issuers.delete(issuer.address.toLowerCase());
    const blocked = await agent
      .get(`/api/issuer/requests?institutionId=${institution.id}`)
      .expect(403);
    assert.equal(blocked.body.error.code, "ROLE_REQUIRED");
  });

  it("claims a 128-bit code once and derives citizen authorization", async () => {
    const issuerAgent = request.agent(app);
    const issuerSession = await login(issuerAgent, issuer);
    const created = await issuerAgent
      .post("/api/issuer/claim-codes")
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({
        institutionId: institution.id,
        recipientReference: "SYNTHETIC-REQUEST-001",
      })
      .expect(201);
    assert.ok(Buffer.from(created.body.code, "base64url").length >= 16);

    const citizenAgent = request.agent(app);
    const citizenSession = await login(citizenAgent, citizen);
    assert.deepEqual(citizenSession.roles, ["UNLINKED"]);
    const claimed = await citizenAgent
      .post("/api/citizen/claim-codes/claim")
      .set("x-csrf-token", citizenSession.csrfToken)
      .send({ code: created.body.code })
      .expect(200);
    assert.ok(claimed.body.authorization.roles.includes("CITIZEN"));

    const secondWallet = Wallet.createRandom();
    const secondAgent = request.agent(app);
    const secondSession = await login(secondAgent, secondWallet);
    const reused = await secondAgent
      .post("/api/citizen/claim-codes/claim")
      .set("x-csrf-token", secondSession.csrfToken)
      .send({ code: created.body.code })
      .expect(403);
    assert.equal(reused.body.error.code, "INVALID_CLAIM_CODE");
  });

  it("atomically freezes one hash while issuance is processing", async () => {
    const claim = db.createClaimCode({
      institutionId: institution.id,
      issuerAddress: issuer.address,
      recipientReference: "SYNTHETIC-REQUEST-002",
      ttlMs: 60_000,
    });
    db.claimCode({ code: claim.code, address: citizen.address });
    const certificateRequest = db.createRequest({
      address: citizen.address,
      institutionId: institution.id,
      certificateType: "Synthetic Academic Certificate",
    });

    const issuerAgent = request.agent(app);
    const issuerSession = await login(issuerAgent, issuer);
    const first = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/prepare-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({ institutionId: institution.id, documentHash: HASH_A })
      .expect(201);
    assert.equal(first.body.status, "PROCESSING");

    const resumed = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/prepare-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({ institutionId: institution.id, documentHash: HASH_A })
      .expect(200);
    assert.equal(resumed.body.attemptId, first.body.attemptId);
    assert.equal(resumed.body.resumed, true);

    const conflicting = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/prepare-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({ institutionId: institution.id, documentHash: HASH_B })
      .expect(409);
    assert.equal(conflicting.body.error.code, "REQUEST_HASH_LOCKED");
  });

  it("confirms issuance idempotently and restricts revocation to the original issuer", async () => {
    const claim = db.createClaimCode({
      institutionId: institution.id,
      issuerAddress: issuer.address,
      recipientReference: "SYNTHETIC-REQUEST-003",
      ttlMs: 60_000,
    });
    db.claimCode({ code: claim.code, address: citizen.address });
    const certificateRequest = db.createRequest({
      address: citizen.address,
      institutionId: institution.id,
      certificateType: "Synthetic Academic Certificate",
    });
    const issuerAgent = request.agent(app);
    const issuerSession = await login(issuerAgent, issuer);
    const prepared = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/prepare-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({ institutionId: institution.id, documentHash: HASH_A })
      .expect(201);
    const confirmed = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/confirm-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({
        institutionId: institution.id,
        attemptId: prepared.body.attemptId,
        transactionHash: TX_A,
      })
      .expect(200);
    assert.equal(confirmed.body.status, "ACTIVE");

    const repeated = await issuerAgent
      .post(`/api/issuer/requests/${certificateRequest.id}/confirm-issuance`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({
        institutionId: institution.id,
        attemptId: prepared.body.attemptId,
        transactionHash: TX_A,
      })
      .expect(200);
    assert.equal(repeated.body.id, confirmed.body.id);

    const otherIssuer = Wallet.createRandom();
    db.seedInstitution({
      name: "Synthetic University",
      slug: "synthetic-university",
      issuerAddress: otherIssuer.address,
    });
    chain.issuers.add(otherIssuer.address.toLowerCase());
    const otherAgent = request.agent(app);
    const otherSession = await login(otherAgent, otherIssuer);
    const denied = await otherAgent
      .post(`/api/issuer/certificates/${confirmed.body.id}/prepare-revocation`)
      .set("x-csrf-token", otherSession.csrfToken)
      .send({ institutionId: institution.id })
      .expect(403);
    assert.equal(denied.body.error.code, "ORIGINAL_ISSUER_REQUIRED");

    const preparedRevocation = await issuerAgent
      .post(`/api/issuer/certificates/${confirmed.body.id}/prepare-revocation`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({ institutionId: institution.id })
      .expect(200);
    const revoked = await issuerAgent
      .post(`/api/issuer/certificates/${confirmed.body.id}/confirm-revocation`)
      .set("x-csrf-token", issuerSession.csrfToken)
      .send({
        institutionId: institution.id,
        attemptId: preparedRevocation.body.attemptId,
        transactionHash: TX_B,
      })
      .expect(200);
    assert.equal(revoked.body.status, "REVOKED");
  });

  it("does not write protected plaintext values into SQLite storage", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "pramaanchain-app-test-"));
    const filename = path.join(directory, "private.sqlite");
    try {
      const fileDb = new AppDatabase(filename, randomBytes(32));
      const wallet = Wallet.createRandom();
      const seeded = fileDb.seedInstitution({
        name: "Public Institution Name",
        slug: "public-institution",
        issuerAddress: wallet.address,
      });
      const claim = fileDb.createClaimCode({
        institutionId: seeded.id,
        issuerAddress: wallet.address,
        recipientReference: "PRIVATE-REFERENCE-MUST-BE-ENCRYPTED",
        ttlMs: 60_000,
      });
      const membership = fileDb.db.prepare(
        "SELECT wallet_enc FROM issuer_memberships LIMIT 1",
      ).get();
      assert.ok(!membership.wallet_enc.includes(wallet.address));
      assert.equal(fileDb.crypto.decrypt(membership.wallet_enc), wallet.address);
      assert.notEqual(
        fileDb.db.prepare("SELECT code_hash FROM claim_codes WHERE id = ?").get(claim.id).code_hash,
        claim.code,
      );
      fileDb.close();

      const rawDatabase = readFileSync(filename).toString("latin1");
      assert.ok(!rawDatabase.includes(wallet.address));
      assert.ok(!rawDatabase.includes("PRIVATE-REFERENCE-MUST-BE-ENCRYPTED"));
      assert.ok(!rawDatabase.includes(claim.code));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
