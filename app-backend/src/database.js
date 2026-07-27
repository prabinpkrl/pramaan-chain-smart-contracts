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

  createInstitution({ name, publicId, issuerAddress }) {
    const institutionId = randomUUID();
    const membershipId = randomUUID();
    const address = this.normalizeWallet(issuerAddress);
    const normalizedPublicId = publicId.toUpperCase();
    const walletHash = this.walletHash(address);
    const timestamp = nowIso();
    return this.db.transaction(() => {
      if (this.db.prepare("SELECT 1 FROM institutions WHERE public_id = ?").get(normalizedPublicId)) {
        throw conflict("PUBLIC_ID_ALREADY_EXISTS", "The public institution ID is already registered");
      }
      if (this.db.prepare("SELECT 1 FROM issuer_memberships WHERE wallet_hash = ?").get(walletHash)) {
        throw conflict("ISSUER_ALREADY_REGISTERED", "The issuer wallet already belongs to an institution");
      }
      this.db.prepare(`
        INSERT INTO institutions (id, public_id, name, created_at)
        VALUES (?, ?, ?, ?)
      `).run(institutionId, normalizedPublicId, name, timestamp);
      this.db.prepare(`
        INSERT INTO issuer_memberships
          (id, institution_id, wallet_hash, wallet_enc, active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(
        membershipId,
        institutionId,
        walletHash,
        this.crypto.encrypt(address),
        timestamp,
      );
      return {
        id: institutionId,
        publicId: normalizedPublicId,
        name,
        issuerAddress: address,
        active: true,
      };
    })();
  }

  listInstitutions() {
    return this.db.prepare(`
      SELECT i.id, i.public_id, i.name, i.active, m.wallet_enc
      FROM institutions i
      JOIN issuer_memberships m ON m.institution_id = i.id AND m.active = 1
      ORDER BY i.name
    `).all().map((row) => ({
      id: row.id,
      publicId: row.public_id,
      name: row.name,
      issuerAddress: this.crypto.decrypt(row.wallet_enc),
      active: Boolean(row.active),
    }));
  }

  getInstitutionByPublicId(publicId) {
    const row = this.db.prepare(`
      SELECT i.id, i.public_id, i.name, i.active, m.wallet_enc
      FROM institutions i
      JOIN issuer_memberships m ON m.institution_id = i.id AND m.active = 1
      WHERE i.public_id = ? AND i.active = 1
    `).get(publicId.toUpperCase());
    return row ? {
      id: row.id,
      publicId: row.public_id,
      name: row.name,
      issuerAddress: this.crypto.decrypt(row.wallet_enc),
      active: true,
    } : null;
  }

  getIssuerMemberships(address) {
    return this.db.prepare(`
      SELECT i.id, i.public_id AS publicId, i.name
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
      SELECT i.id, i.public_id AS publicId, i.name
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

  connectCitizen({ publicId, address }) {
    return this.db.transaction(() => {
      const institution = this.db.prepare(
        "SELECT id, public_id, name FROM institutions WHERE public_id = ? AND active = 1",
      ).get(publicId.toUpperCase());
      if (!institution) {
        throw notFound("INSTITUTION_NOT_FOUND", "No active institution uses that public ID");
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

      const existing = this.db.prepare(`
        SELECT id, active FROM citizen_relationships
        WHERE citizen_id = ? AND institution_id = ?
      `).get(citizen.id, institution.id);
      if (existing) {
        if (!existing.active) {
          this.db.prepare(
            "UPDATE citizen_relationships SET active = 1 WHERE id = ?",
          ).run(existing.id);
        }
        return {
          citizenId: citizen.id,
          connected: false,
          institution: {
            id: institution.id,
            publicId: institution.public_id,
            name: institution.name,
          },
        };
      }

      this.db.prepare(`
        INSERT INTO citizen_relationships
          (id, citizen_id, institution_id, active, created_at)
        VALUES (?, ?, ?, 1, ?)
      `).run(randomUUID(), citizen.id, institution.id, nowIso());
      return {
        citizenId: citizen.id,
        connected: true,
        institution: {
          id: institution.id,
          publicId: institution.public_id,
          name: institution.name,
        },
      };
    })();
  }

  createRequest({ address, institutionId, certificateType }) {
    const citizen = this.getCitizenByAddress(address);
    if (!citizen) throw forbidden("CITIZEN_RELATIONSHIP_REQUIRED", "A citizen relationship is required");
    const relationship = this.db.prepare(`
      SELECT 1 FROM citizen_relationships
      WHERE citizen_id = ? AND institution_id = ? AND active = 1
    `).get(citizen.id, institutionId);
    if (!relationship) throw forbidden("INSTITUTION_RELATIONSHIP_REQUIRED", "The institution is not connected to this citizen");
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
      SELECT r.*, i.name AS institution_name
      FROM certificate_requests r
      JOIN institutions i ON i.id = r.institution_id
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
