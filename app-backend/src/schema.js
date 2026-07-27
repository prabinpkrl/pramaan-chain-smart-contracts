export const schema = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issuer_memberships (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL UNIQUE REFERENCES institutions(id),
  wallet_hash TEXT NOT NULL UNIQUE,
  wallet_enc TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (institution_id, wallet_hash)
);
CREATE INDEX IF NOT EXISTS issuer_wallet_idx ON issuer_memberships(wallet_hash, active);

CREATE TABLE IF NOT EXISTS citizens (
  id TEXT PRIMARY KEY,
  wallet_hash TEXT NOT NULL UNIQUE,
  wallet_enc TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizen_relationships (
  id TEXT PRIMARY KEY,
  citizen_id TEXT NOT NULL REFERENCES citizens(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (citizen_id, institution_id)
);

CREATE TABLE IF NOT EXISTS auth_nonces (
  id TEXT PRIMARY KEY,
  wallet_hash TEXT NOT NULL,
  wallet_enc TEXT NOT NULL,
  nonce_hash TEXT NOT NULL UNIQUE,
  message TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  wallet_hash TEXT NOT NULL,
  wallet_enc TEXT NOT NULL,
  csrf_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS session_token_idx ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS certificate_requests (
  id TEXT PRIMARY KEY,
  citizen_id TEXT NOT NULL REFERENCES citizens(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  certificate_type_enc TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'ISSUED', 'REJECTED')),
  document_hash TEXT UNIQUE,
  processing_issuer_hash TEXT,
  issuance_attempt_id TEXT UNIQUE,
  issuance_transaction_hash TEXT UNIQUE,
  certificate_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS request_institution_idx ON certificate_requests(institution_id, status);
CREATE INDEX IF NOT EXISTS request_citizen_idx ON certificate_requests(citizen_id, created_at);

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE REFERENCES certificate_requests(id),
  citizen_id TEXT NOT NULL REFERENCES citizens(id),
  institution_id TEXT NOT NULL REFERENCES institutions(id),
  document_hash TEXT NOT NULL UNIQUE,
  issuance_transaction_hash TEXT NOT NULL UNIQUE,
  issuer_wallet_hash TEXT NOT NULL,
  issuer_wallet_enc TEXT NOT NULL,
  blockchain_status TEXT NOT NULL CHECK (blockchain_status IN ('ACTIVE', 'REVOKED')),
  issued_at TEXT NOT NULL,
  revocation_attempt_id TEXT UNIQUE,
  revocation_transaction_hash TEXT UNIQUE,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS certificate_institution_idx ON certificates(institution_id, blockchain_status);
CREATE INDEX IF NOT EXISTS certificate_citizen_idx ON certificates(citizen_id, created_at);
`;
