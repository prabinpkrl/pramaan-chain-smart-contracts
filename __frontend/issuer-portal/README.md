# PramaanChain Portal

React/Vite portal for public verification, issuer browser-wallet transactions,
and private citizen certificate assignments.

```bash
npm ci
cp .env.example .env
npm run lint
npm test
npm run dev
```

The public verifier hashes files locally. Issuer writes require an injected
Sepolia wallet. Citizen and issuer authentication uses SIWE through the private
application backend.

All `VITE_*` configuration is public. Never add RPC credentials, API keys,
database encryption keys, private keys, or seed phrases to this project.

See [`../../docs/FRONTEND_APPLICATION.md`](../../docs/FRONTEND_APPLICATION.md)
for the complete service startup order, API, security model, and limitations.
