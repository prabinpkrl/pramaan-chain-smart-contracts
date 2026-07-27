# PramaanChain Prototype Application

This document covers the wallet-connected frontend and the private application
backend. The smart contract and existing `backend/` blockchain gateway remain
separate components.

## Trust boundary

- The blockchain proves that an exact document hash was issued, by which
  address, and whether it is active or revoked.
- The application database privately assigns a certificate proof to a citizen
  account and institution.
- A SIWE signature proves control of the wallet assigned by that private
  relationship.
- The contract does not store a citizen address or prove citizen ownership. If
  the private database is lost, the public certificate proof remains
  verifiable but its citizen assignment is lost.

Certificate files are hashed in the browser and are never uploaded. Only the
SHA-256 digest is sent to the contract.

## Components and ports

| Component | Default URL | Responsibility |
| --- | --- | --- |
| `backend/` | `http://localhost:3000` | Public Sepolia reads and event/certificate index |
| `app-backend/` | `http://localhost:4000` | SIWE, encrypted relationships, requests, transaction confirmation |
| `__frontend/issuer-portal/` | `http://localhost:5173` | Public verifier, issuer portal, citizen portal |

The frontend never receives `WRITE_API_KEY`, `SEPOLIA_RPC_URL`, private keys,
or `APP_DATA_ENCRYPTION_KEY`. Issuer writes are signed directly by an injected
browser wallet. The blockchain gateway's protected write routes are not used
by this frontend.

## Local setup

Use Node.js `22.13.0` or newer.

### Blockchain gateway

```bash
cd backend
npm ci
cp .env.example .env
npm test
npm start
```

The gateway may run read-only. Configure its Sepolia RPC and public contract
values as described in `BACKEND_API.md`.

### Private application backend

Generate a new local encryption key and place it directly into the gitignored
`.env`. Do not share or commit the generated value:

```bash
cd app-backend
npm ci
cp .env.example .env
```

Use an approved password or secret manager to generate 32 random bytes encoded
as base64, and place that value in the gitignored `.env` as
`APP_DATA_ENCRYPTION_KEY`. Configure `SEPOLIA_RPC_URL` there. Do not reuse a
wallet private key as the encryption key or expose the value in terminal logs.

Seed the public test issuer membership and start:

```bash
npm run seed
npm test
npm start
```

The seed command stores the issuer address encrypted and creates the configured
institution. It does not authorize the address on-chain and never needs a
private key.

### Frontend

```bash
cd __frontend/issuer-portal
npm ci
cp .env.example .env
npm run lint
npm test
npm run dev
```

All `VITE_*` values are public browser configuration. No secret name or value
belongs in the frontend environment.

## Authentication and roles

The nonce request contains only the public wallet address. The frontend cannot
select a trusted role. After validating the EIP-4361 SIWE message and
signature, the application backend derives capabilities:

- `ADMIN` from `hasRole(ADMIN_ROLE, address)`;
- `ISSUER` from active institution membership plus
  `isAuthorizedIssuer(address)`;
- `CITIZEN` from an active private citizen–institution relationship; and
- `UNLINKED` when signature control is valid but no relationship exists.

An unlinked wallet can only inspect its session, log out, and claim a code.
Authorization is re-derived for every protected request. Removing an issuer
therefore blocks its active session immediately.

SIWE nonces expire after five minutes and are single-use. Opaque HttpOnly
sessions expire after eight hours. Mutations require exact-origin and CSRF
checks.

## Private storage

SQLite stores operational UUIDs and statuses. AES-256-GCM protects wallet
values, opaque recipient references, certificate types, and private workflow
fields. HKDF-derived HMAC blind indexes permit normalized wallet lookup without
searchable plaintext. Session tokens, SIWE nonces, and claim codes are stored
only as hashes.

This is field encryption, not SQLCipher. Database structure, operational IDs,
and status values remain visible. Database files live under
`app-backend/.data/`, use restrictive file permissions, and are ignored by
Git.

## Citizen relationship

1. A currently authorized issuer creates a 128-bit, single-use claim code for
   its institution and an encrypted opaque recipient reference.
2. The institution gives the code to the known citizen outside the
   application.
3. The citizen signs in with a wallet and claims the code.
4. One atomic transaction checks expiry and use, creates the citizen and
   relationship when necessary, and consumes the code.
5. The citizen may then submit an institution-scoped certificate request.

Codes expire after 24 hours. Creation is limited to ten per hour per issuer and
institution; claim attempts are limited to five per 15 minutes per wallet and
IP.

## Issuance concurrency and confirmation

The issuer selects and hashes the exact local file before preparing issuance.

`POST /api/issuer/requests/:id/prepare-issuance` atomically performs:

```text
PENDING -> PROCESSING
```

The request's hash and attempt ID are frozen under uniqueness constraints. A
second issuer cannot reserve another hash for that request. A processing
request never automatically returns to pending because a transaction may
already have been broadcast. It can only resume using the same hash or
reconcile an already-submitted transaction.

After the wallet submits `issueCertificate`, the confirmation endpoint
independently checks the Sepolia chain, contract, sender, receipt, domain
event, document hash, and final `ACTIVE` state before atomically performing:

```text
PROCESSING -> ISSUED
```

Confirmation is idempotent.

## Revocation

The application first rechecks current institution membership and current
issuer authorization. It then requires the connected wallet to match the
certificate's immutable on-chain issuer. After browser-wallet revocation, the
backend independently validates the receipt and `REVOKED` state.

The application deliberately blocks removed issuers. The deployed contract
still permits a removed original issuer to call revocation directly outside
the application; changing that rule requires a new contract and deployment.
Administrator emergency revocation remains outside this frontend.

## Application API

All responses are JSON. Errors use:

```json
{
  "error": {
    "code": "REQUEST_ALREADY_PROCESSING",
    "message": "The request is already being processed."
  }
}
```

Principal endpoints:

| Method and route | Purpose |
| --- | --- |
| `POST /api/auth/nonce` | Build a SIWE message for an address |
| `POST /api/auth/verify` | Verify signature and derive roles |
| `GET /api/auth/session` | Refresh authorization and CSRF token |
| `POST /api/issuer/claim-codes` | Create one strong one-time code |
| `POST /api/citizen/claim-codes/claim` | Atomically create the relationship |
| `POST /api/citizen/requests` | Create a private institution request |
| `GET /api/issuer/requests` | Read an institution-scoped queue |
| `POST /api/issuer/requests/:id/prepare-issuance` | Freeze request and hash |
| `POST /api/issuer/requests/:id/confirm-issuance` | Validate issuance receipt |
| `POST /api/issuer/certificates/:id/prepare-revocation` | Validate exact original issuer |
| `POST /api/issuer/certificates/:id/confirm-revocation` | Validate revocation receipt |

The frontend uses the blockchain gateway's public
`GET /api/verify/:documentHash` endpoint for public verification.

## Known limitations

- This is a local fellowship prototype, not a production deployment.
- Wallet recovery and address rotation are not implemented.
- The seeded institution workflow has no administrator UI.
- A processing request deliberately requires same-hash resumption or manual
  transaction reconciliation.
- Encrypted database backup, rotation, and disaster recovery require a later
  production design.
- Automated tests never send a Sepolia transaction.
- ZK proofs, mainnet, multisignature administration, production monitoring,
  and document storage remain deferred.
