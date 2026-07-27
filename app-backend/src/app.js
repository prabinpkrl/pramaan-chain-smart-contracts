import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { ZeroAddress, getAddress } from "ethers";
import {
  createSiweChallenge,
  deriveAuthorization,
  requireCsrf,
  requireRole,
  requireSession,
  verifySiweChallenge,
} from "./auth.js";
import { badRequest, forbidden, notFound } from "./errors.js";
import { validateDocumentHash } from "./blockchain.js";

const sessionCookie = "pc_session";

function text(value, name, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    throw badRequest("INVALID_INPUT", `${name} must contain between ${min} and ${max} characters`);
  }
  return value.trim();
}

function institutionId(req) {
  return text(req.query.institutionId || req.body?.institutionId, "institutionId", { max: 100 });
}

function publicInstitutionId(value) {
  const normalized = text(value, "publicId", { min: 3, max: 48 }).toUpperCase();
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalized)) {
    throw badRequest(
      "INVALID_PUBLIC_ID",
      "publicId must use letters, numbers, and single hyphens between segments",
    );
  }
  return normalized;
}

function walletAddress(value, name) {
  try {
    const normalized = getAddress(value);
    if (normalized === ZeroAddress) throw new Error("zero address");
    return normalized;
  } catch {
    throw badRequest("INVALID_WALLET_ADDRESS", `${name} must be a non-zero Ethereum address`);
  }
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function createApp({ db, chain, config, disableRateLimits = false }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === config.appOrigin) return callback(null, true);
      return callback(forbidden("CORS_ORIGIN_DENIED", "Browser origin is not allowed"));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.get("origin");
      if (origin && origin !== config.appOrigin) {
        return next(forbidden("ORIGIN_MISMATCH", "Request origin is not allowed"));
      }
    }
    return next();
  });

  const limiter = (options) => disableRateLimits
    ? (_req, _res, next) => next()
    : rateLimit({ standardHeaders: "draft-8", legacyHeaders: false, ...options });
  const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 20 });
  const connectionLimiter = limiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${req.auth?.address || "anonymous"}`,
  });
  const institutionLimiter = limiter({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `${req.auth?.address || ipKeyGenerator(req.ip)}:${req.body?.publicId || "unknown"}`,
  });

  const sessionRequired = requireSession(db);
  const csrfRequired = requireCsrf(db);
  const refreshAuthorization = asyncRoute(async (req, _res, next) => {
    req.auth.authorization = await deriveAuthorization({
      db,
      chain,
      address: req.auth.address,
    });
    next();
  });
  const issuerRequired = [sessionRequired, refreshAuthorization, requireRole("ISSUER")];
  const citizenRequired = [sessionRequired, refreshAuthorization, requireRole("CITIZEN")];
  const adminRequired = [sessionRequired, refreshAuthorization, requireRole("ADMIN")];

  app.get("/api/health", asyncRoute(async (_req, res) => {
    const blockchain = await chain.checkReady();
    res.json({ status: "ok", blockchain, timestamp: new Date().toISOString() });
  }));

  app.post("/api/auth/nonce", authLimiter, asyncRoute(async (req, res) => {
    let address;
    try {
      address = getAddress(req.body?.address);
    } catch {
      throw badRequest("INVALID_WALLET_ADDRESS", "address must be a valid Ethereum address");
    }
    res.status(201).json(createSiweChallenge({ db, config, address }));
  }));

  app.post("/api/auth/verify", authLimiter, asyncRoute(async (req, res) => {
    const message = text(req.body?.message, "message", { max: 4096 });
    const signature = text(req.body?.signature, "signature", { max: 1024 });
    const address = await verifySiweChallenge({ db, config, message, signature });
    const expiresAt = new Date(Date.now() + config.sessionTtlMs).toISOString();
    const session = db.createSession(address, expiresAt);
    const authorization = await deriveAuthorization({ db, chain, address });
    res.cookie(sessionCookie, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      expires: new Date(expiresAt),
      path: "/",
    });
    res.json({ ...authorization, csrfToken: session.csrfToken, expiresAt });
  }));

  app.get(
    "/api/auth/session",
    sessionRequired,
    refreshAuthorization,
    asyncRoute(async (req, res) => {
      res.json({
        ...req.auth.authorization,
        csrfToken: db.rotateCsrf(req.auth.session.id),
        expiresAt: req.auth.session.expiresAt,
      });
    }),
  );

  app.post("/api/auth/logout", sessionRequired, csrfRequired, (req, res) => {
    db.revokeSession(req.cookies?.[sessionCookie]);
    res.clearCookie(sessionCookie, { path: "/" });
    res.status(204).end();
  });

  app.get(
    "/api/admin/institutions",
    ...adminRequired,
    asyncRoute(async (_req, res) => {
      const institutions = await Promise.all(db.listInstitutions().map(async (institution) => ({
        ...institution,
        authorized: await chain.isAuthorizedIssuer(institution.issuerAddress),
      })));
      res.json({ institutions });
    }),
  );

  app.post(
    "/api/admin/institutions",
    ...adminRequired,
    institutionLimiter,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const issuerAddress = walletAddress(req.body?.issuerAddress, "issuerAddress");
      if (!await chain.isAuthorizedIssuer(issuerAddress)) {
        throw forbidden(
          "ISSUER_NOT_AUTHORIZED",
          "The issuer wallet must be authorized on-chain before registration",
        );
      }
      const institution = db.createInstitution({
        publicId: publicInstitutionId(req.body?.publicId),
        name: text(req.body?.name, "name", { min: 2, max: 120 }),
        issuerAddress,
      });
      res.status(201).json(institution);
    }),
  );

  app.post(
    "/api/citizen/institutions/connect",
    sessionRequired,
    refreshAuthorization,
    csrfRequired,
    connectionLimiter,
    asyncRoute(async (req, res) => {
      const publicId = publicInstitutionId(req.body?.publicId);
      const target = db.getInstitutionByPublicId(publicId);
      if (!target) {
        throw notFound("INSTITUTION_NOT_FOUND", "No active institution uses that public ID");
      }
      if (!await chain.isAuthorizedIssuer(target.issuerAddress)) {
        throw forbidden(
          "INSTITUTION_ISSUER_INACTIVE",
          "The institution's issuer is not currently authorized",
        );
      }
      const result = db.connectCitizen({ publicId, address: req.auth.address });
      const authorization = await deriveAuthorization({ db, chain, address: req.auth.address });
      res.status(result.connected ? 201 : 200).json({ ...result, authorization });
    }),
  );

  app.get("/api/citizen/institutions", ...citizenRequired, (req, res) => {
    res.json({ institutions: req.auth.authorization.citizenRelationships });
  });

  app.post(
    "/api/citizen/requests",
    ...citizenRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const request = db.createRequest({
        address: req.auth.address,
        institutionId: text(req.body?.institutionId, "institutionId", { max: 100 }),
        certificateType: text(req.body?.certificateType, "certificateType", { min: 2, max: 120 }),
      });
      res.status(201).json(request);
    }),
  );

  app.get("/api/citizen/requests", ...citizenRequired, (req, res) => {
    res.json({ requests: db.listCitizenRequests(req.auth.address) });
  });

  app.get("/api/citizen/certificates", ...citizenRequired, (req, res) => {
    res.json({ certificates: db.listCitizenCertificates(req.auth.address) });
  });

  app.get(
    "/api/issuer/requests",
    ...issuerRequired,
    asyncRoute(async (req, res) => {
      res.json({
        requests: db.listIssuerRequests(req.auth.address, institutionId(req)),
      });
    }),
  );

  app.post(
    "/api/issuer/requests/:id/reject",
    ...issuerRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const selectedInstitutionId = institutionId(req);
      db.rejectRequest({
        address: req.auth.address,
        institutionId: selectedInstitutionId,
        requestId: req.params.id,
      });
      res.status(204).end();
    }),
  );

  app.post(
    "/api/issuer/requests/:id/prepare-issuance",
    ...issuerRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const hash = validateDocumentHash(req.body?.documentHash);
      const current = await chain.verifyCertificate(hash);
      if (current.status !== "NOT_FOUND") {
        throw badRequest("DOCUMENT_HASH_ALREADY_EXISTS", "The document hash already exists on-chain");
      }
      const result = db.prepareIssuance({
        address: req.auth.address,
        institutionId: institutionId(req),
        requestId: req.params.id,
        documentHash: hash,
      });
      res.status(result.resumed ? 200 : 201).json(result);
    }),
  );

  app.post(
    "/api/issuer/requests/:id/confirm-issuance",
    ...issuerRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const selectedInstitutionId = institutionId(req);
      const attemptId = text(req.body?.attemptId, "attemptId", { max: 100 });
      const transactionHash = text(req.body?.transactionHash, "transactionHash", { max: 100 });
      const requests = db.listIssuerRequests(req.auth.address, selectedInstitutionId);
      const request = requests.find((item) => item.id === req.params.id);
      if (!request) throw notFound("REQUEST_NOT_FOUND", "Certificate request was not found");
      const chainRecord = await chain.validateIssuance({
        transactionHash,
        documentHash: request.documentHash,
        expectedSender: req.auth.address,
      });
      const certificate = db.confirmIssuance({
        address: req.auth.address,
        institutionId: selectedInstitutionId,
        requestId: req.params.id,
        attemptId,
        transactionHash: chainRecord.transactionHash,
        chainRecord,
      });
      res.json(certificate);
    }),
  );

  app.get(
    "/api/issuer/certificates",
    ...issuerRequired,
    asyncRoute(async (req, res) => {
      res.json({
        certificates: db.listIssuerCertificates(req.auth.address, institutionId(req)),
      });
    }),
  );

  app.post(
    "/api/issuer/certificates/:id/prepare-revocation",
    ...issuerRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const selectedInstitutionId = institutionId(req);
      const certificate = db.getIssuerCertificate(
        req.auth.address,
        selectedInstitutionId,
        req.params.id,
      );
      if (getAddress(certificate.issuer) !== getAddress(req.auth.address)) {
        throw forbidden(
          "ORIGINAL_ISSUER_REQUIRED",
          "Only the certificate's original on-chain issuer wallet may revoke it",
        );
      }
      const chainState = await chain.verifyCertificate(certificate.documentHash);
      if (
        chainState.status !== "ACTIVE"
        || getAddress(chainState.issuer) !== getAddress(req.auth.address)
      ) {
        throw forbidden("REVOCATION_NOT_ALLOWED", "The active certificate is not assigned to this issuer wallet");
      }
      res.json(db.prepareRevocation({
        address: req.auth.address,
        institutionId: selectedInstitutionId,
        certificateId: req.params.id,
      }));
    }),
  );

  app.post(
    "/api/issuer/certificates/:id/confirm-revocation",
    ...issuerRequired,
    csrfRequired,
    asyncRoute(async (req, res) => {
      const selectedInstitutionId = institutionId(req);
      const certificate = db.getIssuerCertificate(
        req.auth.address,
        selectedInstitutionId,
        req.params.id,
      );
      if (getAddress(certificate.issuer) !== getAddress(req.auth.address)) {
        throw forbidden(
          "ORIGINAL_ISSUER_REQUIRED",
          "Only the certificate's original on-chain issuer wallet may revoke it",
        );
      }
      const chainState = await chain.verifyCertificate(certificate.documentHash);
      if (
        chainState.status !== "ACTIVE"
        || getAddress(chainState.issuer) !== getAddress(req.auth.address)
      ) {
        throw forbidden("REVOCATION_NOT_ALLOWED", "The active certificate is not owned by this issuer wallet");
      }
      const transactionHash = text(req.body?.transactionHash, "transactionHash", { max: 100 });
      const attemptId = text(req.body?.attemptId, "attemptId", { max: 100 });
      const chainRecord = await chain.validateRevocation({
        transactionHash,
        documentHash: certificate.documentHash,
        expectedSender: req.auth.address,
      });
      res.json(db.confirmRevocation({
        address: req.auth.address,
        institutionId: selectedInstitutionId,
        certificateId: req.params.id,
        attemptId,
        transactionHash: chainRecord.transactionHash,
        chainRecord,
      }));
    }),
  );

  app.use((_req, _res, next) => next(notFound("ROUTE_NOT_FOUND", "Route not found")));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) ? error.status : 500;
    const code = error.code && typeof error.code === "string"
      ? error.code
      : "INTERNAL_ERROR";
    const message = status >= 500 ? "The application service could not complete the request" : error.message;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: { code, message } });
  });

  return app;
}
