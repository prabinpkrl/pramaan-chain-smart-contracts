# PramaanChain Blockchain

This directory contains the JavaScript-based Hardhat environment for the
PramaanChain smart contract.

Stage 4 implements administrator and issuer access control plus unique
certificate-hash issuance. The approved full interface and behavior are defined
in [`docs/CONTRACT_DESIGN.md`](docs/CONTRACT_DESIGN.md). Certificate lookup,
verification, and revocation are intentionally not implemented yet.

## Local commands

```bash
npm install
npm run compile
npm test
```
