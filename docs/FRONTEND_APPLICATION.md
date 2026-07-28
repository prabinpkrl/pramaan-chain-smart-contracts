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

The public verifier also accepts an already calculated, `0x`-prefixed
32-byte SHA-256 digest. It validates the format locally and performs the same
read-only blockchain lookup as file-based verification.

## Components and ports

| Component | Default URL | Responsibility |
| --- | --- | --- |
| `backend/` | `http://localhost:3000` | Public Sepolia reads and event/certificate index |
| `app-backend/` | `http://localhost:4000` | SIWE, encrypted relationships, requests, transaction confirmation |
| `__frontend/` | `http://localhost:5173` | Public verifier, issuer portal, citizen portal |

The frontend never receives `WRITE_API_KEY`, `SEPOLIA_RPC_URL`, private keys,
or `APP_DATA_ENCRYPTION_KEY`. Issuer writes are signed directly by the
selected browser or WalletConnect mobile provider. The blockchain gateway's
protected write routes are not used by this frontend.

Administrator issuer authorization is also signed directly by the currently
authenticated administrator's selected wallet. The frontend waits for the
receipt and verifies the resulting issuer status through the read-only
gateway. No administrator private key is loaded into either backend. Issuer
removal remains outside the prototype UI. After authorization, the
administrator registers the institution name, stable public ID, and primary
issuer membership through the private backend before it derives the `ISSUER`
application role.

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

Test and start the empty application database:

```bash
npm test
npm start
```

An on-chain administrator signs in and creates institutions through the admin
portal. The portal authorizes a new primary issuer with the administrator's
browser wallet when necessary, then registers the public institution ID and
encrypted issuer membership through the application backend.

The repository intentionally contains no seed command or default application
records. After the explicit database wipe, the first institution must be
provisioned through this administrator flow. Resetting SQLite does not alter
the deployed contract or any existing Sepolia state.

### Frontend

```bash
cd __frontend
npm ci
cp .env.example .env
npm run lint
npm test
npm run build
npm run test:e2e
npm run dev
```

All `VITE_*` values are public browser configuration. No secret name or value
belongs in the frontend environment.

Set `VITE_WALLETCONNECT_PROJECT_ID` to a public Reown project ID when
mobile-wallet QR login is required. Leave it blank for browser-extension-only
development.

`npm run test:e2e` runs deterministic desktop and mobile browser journeys with
mocked wallet and service boundaries. `npm run test:e2e:live` starts the
existing blockchain gateway, a temporary-database application backend, and
the production frontend preview, then checks gateway health and public
certificate verification against Sepolia. The live check is read-only and
must never be expanded to issue, revoke, authorize, or remove an issuer.

## Authentication and roles

The login screen separates wallet connection from authentication. It discovers
EIP-6963 browser providers, falls back to legacy `window.ethereum`, and offers
WalletConnect mobile login when configured. It displays the selected public
address, current chain, and optional balance. Balance lookup is presentational
and cannot block login. The user can change the exposed account and the
frontend can request or add the public Sepolia network metadata. Only the
subsequent SIWE signature creates an application session; connecting a wallet
alone does not assign a role or authenticate the user.

The nonce request contains only the public wallet address. The frontend cannot
select a trusted role. After validating the EIP-4361 SIWE message and
signature, the application backend derives capabilities:

- `ADMIN` from `hasRole(ADMIN_ROLE, address)`;
- `ISSUER` from active institution membership plus
  `isAuthorizedIssuer(address)`;
- `CITIZEN` from an active private citizen–institution relationship; and
- `UNLINKED` when signature control is valid but no relationship exists.

An unlinked wallet can inspect its session, log out, and connect to an
institution using its exact public ID.
Authorization is re-derived for every protected request. Removing an issuer
therefore blocks its active session immediately.

SIWE nonces expire after five minutes and are single-use. Opaque HttpOnly
sessions expire after eight hours. Mutations require exact-origin and CSRF
checks.

## Private storage

SQLite stores operational UUIDs and statuses. AES-256-GCM protects wallet
values, certificate types, and private workflow fields. HKDF-derived HMAC
blind indexes permit normalized wallet lookup without searchable plaintext.
Session tokens and SIWE nonces are stored only as hashes. Institution names
and public IDs are intentionally readable and shareable.

This is field encryption, not SQLCipher. Database structure, operational IDs,
and status values remain visible. Database files live under
`app-backend/.data/`, use restrictive file permissions, and are ignored by
Git.

## Citizen relationship

1. An administrator creates an institution with a stable, human-readable
   public ID such as `TU-NEPAL` and one primary issuer wallet.
2. The institution shares that ID with citizens as text or a QR/link outside
   the application.
3. The citizen signs in with SIWE and enters the exact public ID.
4. One atomic transaction creates the private citizen and institution
   relationship, or returns the existing relationship idempotently.
5. The citizen can connect to multiple institutions and submit a separate
   institution-scoped certificate request to any of them.

No approval or secret claim code is involved. Connection attempts are
rate-limited per wallet and IP. The public ID locates an institution; it does
not prove student status or civil identity.

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
| `GET /api/health` | Check the application backend and chain connection |
| `POST /api/auth/nonce` | Build a SIWE message for an address |
| `POST /api/auth/verify` | Verify signature and derive roles |
| `GET /api/auth/session` | Refresh authorization and CSRF token |
| `POST /api/auth/logout` | Invalidate the current session |
| `GET /api/admin/institutions` | List registered institutions and authorization |
| `POST /api/admin/institutions` | Register an authorized primary issuer and public institution ID |
| `POST /api/citizen/institutions/connect` | Connect the SIWE wallet using a public institution ID |
| `GET /api/citizen/institutions` | List the citizen's connected institutions |
| `POST /api/citizen/requests` | Create a private institution request |
| `GET /api/citizen/requests` | List the citizen's institution-scoped requests |
| `GET /api/citizen/certificates` | List proofs privately assigned to the citizen |
| `GET /api/issuer/requests` | Read an institution-scoped queue |
| `POST /api/issuer/requests/:id/reject` | Reject a pending request |
| `POST /api/issuer/requests/:id/prepare-issuance` | Freeze request and hash |
| `POST /api/issuer/requests/:id/confirm-issuance` | Validate issuance receipt |
| `GET /api/issuer/certificates` | List certificates issued by the institution |
| `POST /api/issuer/certificates/:id/prepare-revocation` | Validate exact original issuer |
| `POST /api/issuer/certificates/:id/confirm-revocation` | Validate revocation receipt |

The frontend uses the blockchain gateway's public
`GET /api/verify/:documentHash` endpoint for public verification.

## Known limitations

- This is a local fellowship prototype, not a production deployment.
- Wallet recovery and address rotation are not implemented.
- The administrator UI creates institutions and primary issuer memberships,
  but does not support removal, deactivation, or wallet rotation.
- A processing request deliberately requires same-hash resumption or manual
  transaction reconciliation.
- Encrypted database backup, rotation, and disaster recovery require a later
  production design.
- Automated tests never send a Sepolia transaction.
- ZK proofs, mainnet, multisignature administration, production monitoring,
  and document storage remain deferred.
