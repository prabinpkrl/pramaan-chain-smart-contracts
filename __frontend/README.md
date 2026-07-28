# PramaanChain Unified Frontend

This React + Vite application provides the public verifier and the
administrator, issuer, citizen, and unlinked-wallet views from one build.

## Interface direction

The interface uses a restrained Ethereum-inspired visual system: neutral
near-black surfaces, crisp borders, one violet interaction accent, clear
status colors, and no decorative gradients. Motion is short and purposeful.
The landing page's proof crystal is an optional, lazy-loaded WebGL enhancement
with a lightweight SVG fallback; portal workflows remain conventional,
responsive, and keyboard accessible.

The component system uses Motion for interface transitions and React Three
Fiber for the isolated landing-page visual. Route-level lazy loading keeps
portal code and blockchain libraries outside the initial page bundle.

## Run locally

Start the read-only blockchain gateway on port `3000` and the private
application backend on port `4000` first. Then:

```bash
npm ci
cp .env.example .env
npm run lint
npm test
npm run build
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

The login screen first connects the injected browser wallet and displays its
address, network, and balance. Wallet connection alone is not login: the user
must separately sign the backend's one-time SIWE message. The frontend can
request Sepolia or add its public network metadata when the wallet does not
already know that chain.

## Trust boundaries

- Public verification requires no wallet. A verifier can paste a
  `0x`-prefixed 32-byte SHA-256 hash or select the original file to hash
  locally; only the resulting `bytes32` digest is queried.
- Citizen relationships, requests, and certificate assignments come from the
  encrypted private application backend. Citizens connect to one or more
  institutions using stable public IDs; no approval or shared secret is used.
- Issuers prepare a request in the private backend, sign the exact hash with
  their injected wallet, and send the transaction hash back for independent
  receipt validation.
- QR codes contain only `/verify/<documentHash>` public URLs.
- Issuer authorization is signed directly by the authenticated administrator
  wallet and verified through a read-only chain lookup after confirmation.
  The administrator then registers the institution name, public ID, and
  primary issuer membership privately. The administrator key never enters
  either backend. Issuer removal remains outside this prototype UI.
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
| `npm run test:e2e` | Build and run mocked desktop/mobile browser journeys |
| `npm run test:e2e:headed` | Run the mocked browser journeys with visible browsers |
| `npm run test:e2e:live` | Start all three real services and run the read-only Sepolia browser check |

The normal E2E suite mocks the wallet, session, and HTTP boundaries so it is
deterministic and cannot broadcast a transaction. The live suite uses the
configured gateway only for health and public certificate verification; it
does not call a write endpoint or request a wallet signature.

For complete startup, security, workflow, and API details, see
[`../docs/FRONTEND_APPLICATION.md`](../docs/FRONTEND_APPLICATION.md). The
implemented route and service integration is documented in
[`../docs/FRONTEND_INTEGRATION.md`](../docs/FRONTEND_INTEGRATION.md).
