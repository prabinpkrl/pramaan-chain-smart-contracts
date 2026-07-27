import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { getAddress } from "ethers";
import { createCryptoBox, hashSecret, randomToken, safeHashEqual } from "./crypto.js";
import { schema } from "./schema.js";
import { conflict, forbidden, notFound } from "./errors.js";

function nowIso() {
  return new Date().toISOString();
}

export class AppDatabase {
  constructor(filename, encryptionKey) {
    if (filename !== ":memory:") {
      fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    }
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(schema);
    if (filename !== ":memory:") fs.chmodSync(filename, 0o600);
    this.crypto = createCryptoBox(encryptionKey);
  }

  close() {
    this.db.close();
  }

  normalizeWallet(address) {
    return getAddress(address);
  }

  walletHash(address) {
    return this.crypto.blindIndex(this.normalizeWallet(address));
  }

  seedInstitution({ name, slug, issuerAddress }) {
    const institutionId = randomUUID();
    const membershipId = randomUUID();
    const address = this.normalizeWallet(issuerAddress);
    const timestamp = nowIso();
    this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO institutions (id, slug, name, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET name = excluded.name, active = 1
      `).run(institutionId, slug, name, timestamp);
      const institution = this.db.prepare("SELECT id FROM institutions WHERE slug = ?").get(slug);
      this.db.prepare(`
        INSERT INTO issuer_memberships
          (id, institution_id, wallet_hash, wallet_enc, active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(institution_id, wallet_hash) DO UPDATE SET
          wallet_enc = excluded.wallet_enc,
          active = 1
      `).run(
        membershipId,
        institution.id,
        this.walletHash(address),
        this.crypto.encrypt(address),
        timestamp,
      );
    })();
    return this.db.prepare("SELECT id, slug, name FROM institutions WHERE slug = ?").get(slug);
  }

  getIssuerMemberships(address) {
    return this.db.prepare(`
      SELECT i.id, i.slug, i.name
      FROM issuer_memberships m
      JOIN institutions i ON i.id = m.institution_id
      WHERE m.wallet_hash = ? AND m.active = 1 AND i.active = 1
      ORDER BY i.name
    `).all(this.walletHash(address));
  }

  getCitizenByAddress(address) {
    return this.db.prepare("SELECT * FROM citizens WHERE wallet_hash = ?")
      .get(this.walletHash(address));
  }

  getCitizenRelationships(address) {
    return this.db.prepare(`
      SELECT i.id, i.slug, i.name
      FROM citizens c
      JOIN citizen_relationships r ON r.citizen_id = c.id
      JOIN institutions i ON i.id = r.institution_id
      WHERE c.wallet_hash = ? AND r.active = 1 AND i.active = 1
      ORDER BY i.name
    `).all(this.walletHash(address));
  }

  saveNonce({ address, nonce, message, expiresAt }) {
    const normalized = this.normalizeWallet(address);
    this.db.prepare(`
      INSERT INTO auth_nonces
        (id, wallet_hash, wallet_enc, nonce_hash, message, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      this.walletHash(normalized),
      this.crypto.encrypt(normalized),
      hashSecret(nonce),
      message,
      expiresAt,
      nowIso(),
    );
  }

  consumeNonce(nonce, message) {
    return this.db.transaction(() => {
      const row = this.db.prepare(
        "SELECT * FROM auth_nonces WHERE nonce_hash = ?",
      ).get(hashSecret(nonce));
      if (
        !row
        || row.used_at
        || row.message !== message
        || Date.parse(row.expires_at) <= Date.now()
      ) {
        throw forbidden("INVALID_OR_EXPIRED_NONCE", "The sign-in challenge is invalid or expired");
      }
      const usedAt = nowIso();
      const result = this.db.prepare(`
        UPDATE auth_nonces SET used_at = ?
        WHERE id = ? AND used_at IS NULL
      `).run(usedAt, row.id);
      if (result.changes !== 1) {
        throw forbidden("NONCE_ALREADY_USED", "The sign-in challenge has already been used");
      }
      return row;
    })();
  }

  createSession(address, expiresAt) {
    const token = randomToken(32);
    const csrfToken = randomToken(32);
    const normalized = this.normalizeWallet(address);
    this.db.prepare(`
      INSERT INTO sessions
        (id, token_hash, wallet_hash, wallet_enc, csrf_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      hashSecret(token),
      this.walletHash(normalized),
      this.crypto.encrypt(normalized),
      hashSecret(csrfToken),
      expiresAt,
      nowIso(),
    );
    return { token, csrfToken, expiresAt };
  }

  getSession(token) {
    if (!token) return null;
    const row = this.db.prepare(
      "SELECT * FROM sessions WHERE token_hash = ?",
    ).get(hashSecret(token));
    if (!row || row.revoked_at || Date.parse(row.expires_at) <= Date.now()) return null;
    return {
      id: row.id,
      address: this.crypto.decrypt(row.wallet_enc),
      csrfHash: row.csrf_hash,
      expiresAt: row.expires_at,
    };
  }

  validateCsrf(session, csrfToken) {
    return Boolean(csrfToken) && safeHashEqual(csrfToken, session.csrfHash);
  }

  rotateCsrf(sessionId) {
    const csrfToken = randomToken(32);
    this.db.prepare(
      "UPDATE sessions SET csrf_hash = ? WHERE id = ? AND revoked_at IS NULL",
    ).run(hashSecret(csrfToken), sessionId);
    return csrfToken;
  }

  revokeSession(token) {
    if (!token) return;
    this.db.prepare(
      "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    ).run(nowIso(), hashSecret(token));
  }

  createClaimCode({ institutionId, issuerAddress, recipientReference, ttlMs }) {
    const code = randomToken(16);
    const timestamp = nowIso();
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const id = randomUUID();
    this.db.prepare(`
      INSERT INTO claim_codes
        (id, institution_id, code_hash, recipient_reference_enc,
         created_by_wallet_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      institutionId,
      hashSecret(code),
      this.crypto.encrypt(recipientReference),
      this.walletHash(issuerAddress),
      expiresAt,
      timestamp,
    );
    return { id, code, expiresAt };
  }

  claimCode({ code, address }) {
    return this.db.transaction(() => {
      const claim = this.db.prepare(
        "SELECT * FROM claim_codes WHERE code_hash = ?",
      ).get(hashSecret(code));
      if (!claim || claim.claimed_at || Date.parse(claim.expires_at) <= Date.now()) {
        throw forbidden("INVALID_CLAIM_CODE", "The claim code is invalid or unavailable");
      }

      const normalized = this.normalizeWallet(address);
      const walletHash = this.walletHash(normalized);
      let citizen = this.db.prepare("SELECT * FROM citizens WHERE wallet_hash = ?").get(walletHash);
      if (!citizen) {
        const citizenId = randomUUID();
        this.db.prepare(`
          INSERT INTO citizens (id, wallet_hash, wallet_enc, created_at)
          VALUES (?, ?, ?, ?)
        `).run(citizenId, walletHash, this.crypto.encrypt(normalized), nowIso());
        citizen = this.db.prepare("SELECT * FROM citizens WHERE id = ?").get(citizenId);
      }

      this.db.prepare(`
        INSERT INTO citizen_relationships
          (id, citizen_id, institution_id, claim_code_id, active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
        ON CONFLICT(citizen_id, institution_id) DO UPDATE SET active = 1
      `).run(randomUUID(), citizen.id, claim.institution_id, claim.id, nowIso());

      const result = this.db.prepare(`
        UPDATE claim_codes SET claimed_at = ?, claimed_by_citizen_id = ?
        WHERE id = ? AND claimed_at IS NULL
      `).run(nowIso(), citizen.id, claim.id);
      if (result.changes !== 1) {
        throw conflict("CLAIM_CODE_ALREADY_USED", "The claim code is no longer available");
      }

      const institution = this.db.prepare(
        "SELECT id, slug, name FROM institutions WHERE id = ?",
      ).get(claim.institution_id);
      return { citizenId: citizen.id, institution };
    })();
  }

  createRequest({ address, institutionId, certificateType }) {
    const citizen = this.getCitizenByAddress(address);
    if (!citizen) throw forbidden("CITIZEN_RELATIONSHIP_REQUIRED", "A citizen relationship is required");
    const relationship = this.db.prepare(`
      SELECT 1 FROM citizen_relationships
      WHERE citizen_id = ? AND institution_id = ? AND active = 1
    `).get(citizen.id, institutionId);
    if (!relationship) throw forbidden("INSTITUTION_RELATIONSHIP_REQUIRED", "The institution has not been claimed");
    const id = randomUUID();
    const timestamp = nowIso();
    this.db.prepare(`
      INSERT INTO certificate_requests
        (id, citizen_id, institution_id, certificate_type_enc, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
    `).run(id, citizen.id, institutionId, this.crypto.encrypt(certificateType), timestamp, timestamp);
    return this.getRequestForCitizen(address, id);
  }

  mapRequest(row) {
    return {
      id: row.id,
      institutionId: row.institution_id,
      institutionName: row.institution_name,
      recipientReference: row.recipient_reference_enc
        ? this.crypto.decrypt(row.recipient_reference_enc)
        : undefined,
      certificateType: this.crypto.decrypt(row.certificate_type_enc),
      status: row.status,
      documentHash: row.document_hash,
      transactionHash: row.issuance_transaction_hash,
      attemptId: row.issuance_attempt_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  getRequestForCitizen(address, requestId) {
    const citizen = this.getCitizenByAddress(address);
    if (!citizen) return null;
    const row = this.db.prepare(`
      SELECT r.*, i.name AS institution_name
      FROM certificate_requests r
      JOIN institutions i ON i.id = r.institution_id
      WHERE r.id = ? AND r.citizen_id = ?
    `).get(requestId, citizen.id);
    return row ? this.mapRequest(row) : null;
  }

  listCitizenRequests(address) {
    const citizen = this.getCitizenByAddress(address);
    if (!citizen) return [];
    return this.db.prepare(`
      SELECT r.*, i.name AS institution_name
      FROM certificate_requests r
      JOIN institutions i ON i.id = r.institution_id
      WHERE r.citizen_id = ?
      ORDER BY r.created_at DESC
    `).all(citizen.id).map((row) => this.mapRequest(row));
  }

  listIssuerRequests(address, institutionId) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");
    return this.db.prepare(`
      SELECT r.*, i.name AS institution_name, cc.recipient_reference_enc
      FROM certificate_requests r
      JOIN institutions i ON i.id = r.institution_id
      LEFT JOIN citizen_relationships cr
        ON cr.citizen_id = r.citizen_id AND cr.institution_id = r.institution_id
      LEFT JOIN claim_codes cc ON cc.id = cr.claim_code_id
      WHERE r.institution_id = ?
      ORDER BY r.created_at DESC
    `).all(institutionId).map((row) => this.mapRequest(row));
  }

  rejectRequest({ address, institutionId, requestId }) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");
    const result = this.db.prepare(`
      UPDATE certificate_requests
      SET status = 'REJECTED', updated_at = ?
      WHERE id = ? AND institution_id = ? AND status = 'PENDING'
    `).run(nowIso(), requestId, institutionId);
    if (result.changes !== 1) {
      throw conflict("REQUEST_NOT_PENDING", "Only a pending request can be rejected");
    }
  }

  prepareIssuance({ address, institutionId, requestId, documentHash }) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");

    return this.db.transaction(() => {
      const current = this.db.prepare(
        "SELECT * FROM certificate_requests WHERE id = ? AND institution_id = ?",
      ).get(requestId, institutionId);
      if (!current) throw notFound("REQUEST_NOT_FOUND", "Certificate request was not found");
      if (current.status === "PROCESSING") {
        if (current.document_hash !== documentHash) {
          throw conflict("REQUEST_HASH_LOCKED", "This request is already processing a different document hash");
        }
        return {
          requestId,
          attemptId: current.issuance_attempt_id,
          documentHash,
          status: "PROCESSING",
          resumed: true,
        };
      }
      if (current.status !== "PENDING") {
        throw conflict("REQUEST_NOT_PENDING", "Only a pending request can be prepared for issuance");
      }

      const attemptId = randomUUID();
      try {
        const result = this.db.prepare(`
          UPDATE certificate_requests
          SET status = 'PROCESSING', document_hash = ?,
              processing_issuer_hash = ?, issuance_attempt_id = ?, updated_at = ?
          WHERE id = ? AND institution_id = ? AND status = 'PENDING'
        `).run(
          documentHash,
          this.walletHash(address),
          attemptId,
          nowIso(),
          requestId,
          institutionId,
        );
        if (result.changes !== 1) {
          throw conflict("REQUEST_ALREADY_PROCESSING", "The request is already being processed");
        }
      } catch (error) {
        if (error.code?.startsWith("SQLITE_CONSTRAINT")) {
          throw conflict("DOCUMENT_HASH_RESERVED", "The document hash is already assigned to another request");
        }
        throw error;
      }
      return { requestId, attemptId, documentHash, status: "PROCESSING", resumed: false };
    })();
  }

  confirmIssuance({ address, institutionId, requestId, attemptId, transactionHash, chainRecord }) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");
    const normalized = this.normalizeWallet(address);

    return this.db.transaction(() => {
      const request = this.db.prepare(
        "SELECT * FROM certificate_requests WHERE id = ? AND institution_id = ?",
      ).get(requestId, institutionId);
      if (!request) throw notFound("REQUEST_NOT_FOUND", "Certificate request was not found");
      if (request.status === "ISSUED") {
        if (request.issuance_transaction_hash !== transactionHash) {
          throw conflict("ISSUANCE_ALREADY_CONFIRMED", "The request was confirmed with another transaction");
        }
        return this.getCertificateByRequest(requestId);
      }
      if (request.status !== "PROCESSING" || request.issuance_attempt_id !== attemptId) {
        throw conflict("INVALID_ISSUANCE_ATTEMPT", "The issuance attempt does not match the processing request");
      }

      const certificateId = randomUUID();
      const timestamp = nowIso();
      this.db.prepare(`
        INSERT INTO certificates
          (id, request_id, citizen_id, institution_id, document_hash,
           issuance_transaction_hash, issuer_wallet_hash, issuer_wallet_enc,
           blockchain_status, issued_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
      `).run(
        certificateId,
        request.id,
        request.citizen_id,
        request.institution_id,
        request.document_hash,
        transactionHash,
        this.walletHash(normalized),
        this.crypto.encrypt(normalized),
        chainRecord.issuedAt,
        timestamp,
        timestamp,
      );
      const updated = this.db.prepare(`
        UPDATE certificate_requests
        SET status = 'ISSUED', issuance_transaction_hash = ?,
            certificate_id = ?, updated_at = ?
        WHERE id = ? AND status = 'PROCESSING'
      `).run(transactionHash, certificateId, timestamp, request.id);
      if (updated.changes !== 1) {
        throw conflict("ISSUANCE_CONFIRMATION_RACE", "The request changed during confirmation");
      }
      return this.getCertificateByRequest(requestId);
    })();
  }

  mapCertificate(row) {
    return {
      id: row.id,
      requestId: row.request_id,
      institutionId: row.institution_id,
      institutionName: row.institution_name,
      certificateType: row.certificate_type_enc
        ? this.crypto.decrypt(row.certificate_type_enc)
        : undefined,
      documentHash: row.document_hash,
      transactionHash: row.issuance_transaction_hash,
      issuer: this.crypto.decrypt(row.issuer_wallet_enc),
      status: row.blockchain_status,
      issuedAt: row.issued_at,
      revokedAt: row.revoked_at,
      revocationTransactionHash: row.revocation_transaction_hash,
    };
  }

  getCertificateByRequest(requestId) {
    const row = this.db.prepare(`
      SELECT c.*, i.name AS institution_name, r.certificate_type_enc
      FROM certificates c
      JOIN institutions i ON i.id = c.institution_id
      JOIN certificate_requests r ON r.id = c.request_id
      WHERE c.request_id = ?
    `).get(requestId);
    return row ? this.mapCertificate(row) : null;
  }

  listCitizenCertificates(address) {
    const citizen = this.getCitizenByAddress(address);
    if (!citizen) return [];
    return this.db.prepare(`
      SELECT c.*, i.name AS institution_name, r.certificate_type_enc
      FROM certificates c
      JOIN institutions i ON i.id = c.institution_id
      JOIN certificate_requests r ON r.id = c.request_id
      WHERE c.citizen_id = ?
      ORDER BY c.created_at DESC
    `).all(citizen.id).map((row) => this.mapCertificate(row));
  }

  listIssuerCertificates(address, institutionId) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");
    return this.db.prepare(`
      SELECT c.*, i.name AS institution_name, r.certificate_type_enc
      FROM certificates c
      JOIN institutions i ON i.id = c.institution_id
      JOIN certificate_requests r ON r.id = c.request_id
      WHERE c.institution_id = ?
      ORDER BY c.created_at DESC
    `).all(institutionId).map((row) => this.mapCertificate(row));
  }

  getIssuerCertificate(address, institutionId, certificateId) {
    const allowed = this.getIssuerMemberships(address).some((item) => item.id === institutionId);
    if (!allowed) throw forbidden("INSTITUTION_ACCESS_DENIED", "The issuer does not belong to this institution");
    const row = this.db.prepare(`
      SELECT c.*, i.name AS institution_name, r.certificate_type_enc
      FROM certificates c
      JOIN institutions i ON i.id = c.institution_id
      JOIN certificate_requests r ON r.id = c.request_id
      WHERE c.id = ? AND c.institution_id = ?
    `).get(certificateId, institutionId);
    if (!row) throw notFound("CERTIFICATE_NOT_FOUND", "Certificate assignment was not found");
    return this.mapCertificate(row);
  }

  prepareRevocation({ address, institutionId, certificateId }) {
    const certificate = this.getIssuerCertificate(address, institutionId, certificateId);
    if (certificate.status !== "ACTIVE") {
      throw conflict("CERTIFICATE_NOT_ACTIVE", "Only an active certificate can be prepared for revocation");
    }
    const row = this.db.prepare(
      "SELECT revocation_attempt_id FROM certificates WHERE id = ?",
    ).get(certificateId);
    const attemptId = row.revocation_attempt_id || randomUUID();
    if (!row.revocation_attempt_id) {
      this.db.prepare(`
        UPDATE certificates
        SET revocation_attempt_id = ?, updated_at = ?
        WHERE id = ? AND blockchain_status = 'ACTIVE' AND revocation_attempt_id IS NULL
      `).run(attemptId, nowIso(), certificateId);
    }
    return { attemptId, documentHash: certificate.documentHash, status: "ACTIVE" };
  }

  confirmRevocation({
    address,
    institutionId,
    certificateId,
    attemptId,
    transactionHash,
    chainRecord,
  }) {
    const certificate = this.getIssuerCertificate(address, institutionId, certificateId);
    if (certificate.status === "REVOKED") {
      if (certificate.revocationTransactionHash !== transactionHash) {
        throw conflict("REVOCATION_ALREADY_CONFIRMED", "The certificate was confirmed with another revocation transaction");
      }
      return certificate;
    }
    const row = this.db.prepare(
      "SELECT revocation_attempt_id FROM certificates WHERE id = ?",
    ).get(certificateId);
    if (!row.revocation_attempt_id || row.revocation_attempt_id !== attemptId) {
      throw conflict("INVALID_REVOCATION_ATTEMPT", "The revocation attempt does not match this certificate");
    }
    const timestamp = nowIso();
    this.db.prepare(`
      UPDATE certificates
      SET blockchain_status = 'REVOKED', revocation_transaction_hash = ?,
          revoked_at = ?, updated_at = ?
      WHERE id = ? AND blockchain_status = 'ACTIVE'
    `).run(transactionHash, chainRecord.revokedAt, timestamp, certificateId);
    return this.getIssuerCertificate(address, institutionId, certificateId);
  }
}
