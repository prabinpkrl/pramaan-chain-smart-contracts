# PramaanChain Frontend Integration

## 1. Current status

This document records the implemented integration between the React frontend,
the private application backend, the read-only blockchain gateway, and the
deployed Sepolia contract.

The browser application is implemented in `__frontend/`. Private
authentication and institution relationships are implemented in
`app-backend/`. Public blockchain reads and the event-derived certificate
index are implemented in `backend/`.

## 2. Component boundaries

| Component | Default URL | Responsibility |
| --- | --- | --- |
| `__frontend/` | `http://localhost:5173` | Public verification and wallet-connected portals |
| `app-backend/` | `http://localhost:4000` | SIWE, sessions, encrypted relationships, requests, and receipt confirmation |
| `backend/` | `http://localhost:3000` | Public contract reads and event/certificate indexing |
| Sepolia contract | chain ID `11155111` | Issuer authorization and immutable certificate status |

The frontend never receives a wallet private key, credentialed RPC URL,
`WRITE_API_KEY`, or `APP_DATA_ENCRYPTION_KEY`. Administrator, issuer, and
citizen users sign only through an injected browser wallet.

The gateway's optional `/api/write/*` routes remain server-side integration
interfaces. The current frontend does not call them. Issuer and administrator
transactions are prepared in the browser and independently confirmed through
the application backend or read-only gateway.

## 3. Wallet connection and SIWE

Wallet connection and application authentication are intentionally separate:

1. The user connects an injected wallet.
2. The login page displays the selected address, current network, and optional
   balance.
3. The user may change the exposed account. If needed, the frontend can
   request Sepolia or add its public network metadata.
4. The user selects **Sign in with Ethereum**.
5. The backend generates a short-lived, single-use EIP-4361 message.
6. The wallet signs that exact message.
7. The backend verifies the signature and creates an HttpOnly session.

Connecting a wallet alone does not authenticate the user or assign a role.
Balance display is presentational; a failed balance lookup does not block
SIWE. The SIWE challenge nonce is unrelated to the wallet's Ethereum
transaction nonce and the gateway's HTTP `Idempotency-Key`.

The backend derives capabilities instead of accepting a role from the
browser:

- `ADMIN` requires the wallet to hold the contract's `ADMIN_ROLE`;
- `ISSUER` requires active institution membership and current on-chain issuer
  authorization;
- `CITIZEN` requires an active private citizen–institution relationship; and
- `UNLINKED` means signature control is valid but no relationship exists.

Protected application requests re-derive authorization. Multi-role wallets
can switch among their available portals.

## 4. Institution provisioning and citizen connection

An administrator provisions an institution through the admin portal:

1. Enter an institution name, stable public ID, and primary issuer wallet.
2. If the primary wallet is not already authorized, sign
   `authorizeIssuer(address)` with the administrator's browser wallet.
3. Wait for a successful receipt and verify the resulting issuer status
   through the read-only gateway.
4. Register the institution and encrypted primary issuer membership in the
   private application backend.

Public institution IDs use a stable uppercase hyphenated form such as
`TU-NEPAL`. An institution shares this ID with its citizens. It is a public
locator, not a password or proof of institutional eligibility.

After SIWE, an unlinked or existing citizen enters the exact public ID. The
backend creates the citizen–institution relationship atomically or returns
the existing relationship idempotently. There is no approval step or secret
claim code. A citizen can connect to multiple institutions and make
institution-scoped service requests to each one.

The database starts empty after the explicit data wipe. An administrator must
provision institutions through the current flow; there is no seed-data
command.

## 5. Public verification

Public verification requires no wallet or session. A verifier can:

- select the original document and hash its exact raw bytes locally with
  SHA-256; or
- paste an already calculated `0x`-prefixed 32-byte SHA-256 digest.

The frontend validates the digest and navigates to
`/verify/<documentHash>`. It calls:

```text
GET http://localhost:3000/api/verify/<documentHash>
```

The result distinguishes:

| Status | Meaning |
| --- | --- |
| `ACTIVE` | Issued and not revoked |
| `REVOKED` | Issued and permanently revoked |
| `NOT_FOUND` | Never issued under that exact hash |

Only the hash is sent for verification. The selected file remains in the
browser. QR codes contain only the public `/verify/<documentHash>` URL.

## 6. Issuance flow

The citizen creates a private request for one connected institution. An
issuer reads only its institution-scoped queue and selects the exact local
certificate file.

The browser hashes the raw file bytes with SHA-256. It does not hash the file
name, path, Base64 representation, or metadata.

The issuance sequence is:

```text
PENDING
  -> POST /api/issuer/requests/:id/prepare-issuance
PROCESSING
  -> injected wallet signs issueCertificate(documentHash)
  -> POST /api/issuer/requests/:id/confirm-issuance
ISSUED
```

Preparation freezes the hash and attempt ID. Confirmation independently
checks the Sepolia chain, contract, transaction sender, successful receipt,
domain event, document hash, and final `ACTIVE` state before assigning the
proof privately to the citizen.

A `PROCESSING` request does not automatically return to `PENDING`, because a
transaction may already have been broadcast. It must resume with the same hash
or be reconciled against the submitted transaction.

## 7. Revocation flow

The frontend and application backend recheck institution membership and
current on-chain authorization. The connected wallet must match the
certificate's immutable original issuer.

After the wallet signs `revokeCertificate(documentHash)`, the backend verifies
the successful receipt and final `REVOKED` state before updating the private
record. Administrator emergency revocation and issuer removal are not exposed
in the current UI.

## 8. Public gateway reads

The frontend uses these gateway endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Connection and certificate-index readiness |
| `GET /api/verify/:documentHash` | Direct authoritative verification |
| `GET /api/certificates/:documentHash` | Full certificate record |
| `GET /api/issuer/:address` | Current issuer authorization |
| `GET /api/certificates` | Indexed current certificate list |
| `GET /api/certificates/summary` | Indexed totals |
| `GET /api/events/transformed` | Human-readable confirmed domain events |

Direct hash verification remains available when the historical index is
degraded. Index-backed lists and summaries require the RPC to support
historical `eth_getLogs` from deployment block `11318772`.

## 9. Application routes

| Route | Access |
| --- | --- |
| `/` | Public home |
| `/login` | Wallet connection and SIWE |
| `/verify` and `/verify/:documentHash` | Public verifier |
| `/admin/dashboard`, `/admin/issuers`, `/admin/monitor`, `/admin/audit-logs` | `ADMIN` |
| `/issuer/dashboard`, `/issuer/issue`, `/issuer/documents`, `/issuer/revoked`, `/issuer/profile` | `ISSUER` |
| `/citizen/dashboard`, `/citizen/connect`, `/citizen/requests`, `/citizen/my-documents`, `/citizen/history` | `CITIZEN`, with `/citizen/connect` also available to `UNLINKED` |

Route guards are a user-interface control only. The backend remains the
authorization boundary for private data and mutations.

## 10. Privacy and limitations

- Certificate files never enter the contract or application backend.
- The public chain stores a hash, issuer address, timestamps, and status only.
- Private citizen assignments depend on the encrypted SQLite database and are
  not proven on-chain.
- Institution IDs are deliberately public and must not encode personal data.
- Wallet recovery, address rotation, issuer removal, administrator emergency
  revocation, production deployment, multisignature governance, and document
  delivery remain outside the current prototype.

For setup and the complete private API list, see
[`FRONTEND_APPLICATION.md`](FRONTEND_APPLICATION.md). For public gateway
requests and responses, see [`BACKEND_API.md`](BACKEND_API.md) and
[`BACKEND_SAMPLES.md`](BACKEND_SAMPLES.md).
