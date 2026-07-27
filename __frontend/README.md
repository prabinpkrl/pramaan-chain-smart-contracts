# PramaanChain Unified Frontend

This React + Vite application provides the public verifier and the
administrator, issuer, citizen, and unlinked-wallet views from one build.

## Run locally

Start the read-only blockchain gateway on port `3000` and the private
application backend on port `4000` first. Then:

```bash
npm ci
cp .env.example .env
npm run lint
npm test
npm run dev
```

All `VITE_*` settings are public browser configuration. Never add RPC
credentials, API keys, application encryption keys, or wallet private keys to
this directory.

## Authentication and roles

Wallet sign-in uses a backend-generated EIP-4361 SIWE challenge. The
application backend validates the signature and derives `ADMIN`, `ISSUER`,
`CITIZEN`, or `UNLINKED`; the browser does not assert or persist trusted
roles. An HttpOnly session cookie and CSRF token protect private operations.
Multi-role wallets can switch portals from the header.

## Trust boundaries

- Public verification requires no wallet. The file is SHA-256 hashed locally
  and only its `bytes32` digest is queried.
- Citizen relationships, requests, and certificate assignments come from the
  encrypted private application backend.
- Issuers prepare a request in the private backend, sign the exact hash with
  their injected wallet, and send the transaction hash back for independent
  receipt validation.
- QR codes contain only `/verify/<documentHash>` public URLs.
- Administrator issuer authorization/removal is deliberately read-only in
  this prototype; no administrator key or transaction flow exists here.
- The blockchain gateway's optional API-key write endpoints are never called
  by this browser application.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run lint` | Check source and tests with ESLint |
| `npm test` | Run the frontend unit tests |
| `npm run build` | Build the production bundle under `dist/` |
| `npm run preview` | Preview the built bundle |

For complete startup, security, workflow, and API details, see
[`../docs/FRONTEND_APPLICATION.md`](../docs/FRONTEND_APPLICATION.md).
