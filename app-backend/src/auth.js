import { randomUUID } from "node:crypto";
import { getAddress } from "ethers";
import { SiweMessage } from "siwe";
import { forbidden, unauthorized } from "./errors.js";
import { randomToken } from "./crypto.js";

export async function deriveAuthorization({ db, chain, address }) {
  const normalized = getAddress(address);
  const [admin, issuerMemberships, citizenRelationships] = await Promise.all([
    chain.isAdmin(normalized),
    Promise.resolve(db.getIssuerMemberships(normalized)),
    Promise.resolve(db.getCitizenRelationships(normalized)),
  ]);
  const issuerAuthorized = issuerMemberships.length > 0
    ? await chain.isAuthorizedIssuer(normalized)
    : false;
  const isIssuer = issuerAuthorized && issuerMemberships.length > 0;
  const roles = [];
  if (admin) roles.push("ADMIN");
  if (isIssuer) roles.push("ISSUER");
  else if (citizenRelationships.length > 0) roles.push("CITIZEN");
  if (roles.length === 0) roles.push("UNLINKED");
  return {
    address: normalized,
    roles,
    issuerMemberships: issuerAuthorized ? issuerMemberships : [],
    citizenRelationships: isIssuer ? [] : citizenRelationships,
  };
}

export function createSiweChallenge({ db, config, address }) {
  const normalized = getAddress(address);
  const nonce = randomToken(16).replaceAll("-", "a").replaceAll("_", "b");
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + config.nonceTtlMs);
  const message = new SiweMessage({
    domain: config.siweDomain,
    address: normalized,
    statement: "Sign in to PramaanChain. This does not submit a blockchain transaction.",
    uri: config.appOrigin,
    version: "1",
    chainId: config.chainId,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString(),
    requestId: randomUUID(),
  }).prepareMessage();
  db.saveNonce({ address: normalized, nonce, message, expiresAt: expiresAt.toISOString() });
  return { message, expiresAt: expiresAt.toISOString() };
}

export async function verifySiweChallenge({ db, config, message, signature }) {
  let parsed;
  try {
    parsed = new SiweMessage(message);
  } catch {
    throw forbidden("INVALID_SIWE_MESSAGE", "The sign-in message is invalid");
  }
  if (
    parsed.domain !== config.siweDomain
    || parsed.uri !== config.appOrigin
    || Number(parsed.chainId) !== config.chainId
  ) {
    throw forbidden("SIWE_CONTEXT_MISMATCH", "The sign-in message does not match this application");
  }
  try {
    const result = await parsed.verify({
      signature,
      domain: config.siweDomain,
      nonce: parsed.nonce,
      time: new Date().toISOString(),
    });
    if (!result.success) throw new Error("Signature verification failed");
  } catch {
    throw forbidden("INVALID_WALLET_SIGNATURE", "The wallet signature is invalid");
  }
  db.consumeNonce(parsed.nonce, message);
  return getAddress(parsed.address);
}

export function requireSession(db) {
  return (req, _res, next) => {
    const session = db.getSession(req.cookies?.pc_session);
    if (!session) return next(unauthorized());
    req.auth = { session, address: session.address };
    return next();
  };
}

export function requireCsrf(db) {
  return (req, _res, next) => {
    if (!db.validateCsrf(req.auth.session, req.get("x-csrf-token"))) {
      return next(forbidden("INVALID_CSRF_TOKEN", "A valid CSRF token is required"));
    }
    return next();
  };
}

export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.auth.authorization.roles.includes(role)) {
      return next(forbidden("ROLE_REQUIRED", `${role} authorization is required`));
    }
    return next();
  };
}
