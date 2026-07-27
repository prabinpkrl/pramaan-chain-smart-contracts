# PramaanChain Frontend

A single React + Vite app serving all three PramaanChain portals — **Admin**,
**Issuer**, and **Citizen** — behind one MetaMask login, as recommended in
the project's architecture notes (one app, shared components, role-based
routing, rather than three separate builds).

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your backend URL / admin addresses
npm run dev
```

Build for production:

```bash
npm run build   # outputs to dist/
```

Lint (zero errors/warnings expected):

```bash
npm run lint
```

## How login & roles work

1. The person clicks **Connect with MetaMask** (`src/pages/Login/Login.jsx`).
2. Once a wallet address is returned, `src/utils/resolveRole.js` decides the
   role:
   - **Admin** — address matches `VITE_ADMIN_ADDRESSES` in `.env`. This is a
     UI-only shortcut: the backend doesn't expose an admin-role lookup yet,
     so it's not an access-control boundary by itself.
   - **Issuer** — confirmed against the real `GET /api/issuer/:address`
     endpoint.
   - **Citizen** — the default for every other wallet. Anyone can verify a
     document.
3. `src/context/AuthContext.jsx` stores the address/role for the session and
   `src/components/auth/ProtectedRoute.jsx` guards each portal's routes,
   redirecting to the portal that matches the connected wallet's role.

## Structure

```
src/
  components/
    auth/        ProtectedRoute
    common/      Shared UI primitives (Button, Card, Modal, Badge, ...)
    document/    DocumentDetails (shared verification/registry detail view)
    layout/      DashboardLayout, Header, role-aware Sidebar
  context/       AuthContext + useAuth hook
  pages/
    admin/       Dashboard, ManageIssuers, BlockchainMonitor, AuditLogs
    issuer/      Dashboard, IssueDocument, DocumentRegistry, RevokedDocuments, Profile
    citizen/     Dashboard, VerifyDocument, MyDocuments, VerificationHistory
    Login/       MetaMask connect screen
  routes/        AppRoutes.jsx — role-based route tree
  services/      api.js (axios instance), documentService.js (backend calls)
  utils/         wallet, hashing, validation, role resolution, verification history
```

## What's real vs. placeholder

Everything that calls a real backend endpoint (see `docs/BACKEND_API.md`) is
wired up live: issuing, revoking, verifying, listing documents, the issuer
authorization check, health/monitor data, and the events feed for audit logs.

A few pieces are intentionally UI-only placeholders because the backend
doesn't have the matching endpoint yet — each is clearly labeled in the UI
itself, not hidden:

- **Admin → Manage Issuers**: authorize/remove actions are queued locally
  (the on-chain `authorizeIssuer` / `removeIssuer` functions exist, but
  aren't exposed over HTTP yet).
- **Admin → Dashboard**: "Total Issuers", "Verified Today", and "Gas Used"
  cards need dedicated endpoints.
- **Citizen → My Documents / Verification History**: since the backend
  doesn't track per-wallet document ownership or history, these are built
  from a local, per-browser log of documents this device has verified
  (stored in `localStorage`, see `src/utils/verificationHistory.js`).

Once the corresponding backend routes exist, swapping the placeholder logic
for a real API call is a small, contained change in each of those files.
