# Stage 9 Clean-Installation Validation

Date: 2026-07-21

> Historical clean-install evidence. Package counts and test counts below are
> the values recorded at Stage 9, not the current full repository totals. See
> [`README.md`](README.md) for the documentation index.

Stage 9 was validated from a temporary copy that excluded `.git`,
`node_modules/`, `artifacts/`, `cache/`, `coverage/`, and generated type
directories. This exercised the documented workflow without relying on the
working copy's installed dependencies or build output.

## Results

| Step | Command | Result |
| --- | --- | --- |
| Exact dependency installation | `npm ci` | Passed; 264 packages installed |
| Production dependency audit | `npm audit --omit=dev` | Passed; 0 vulnerabilities |
| Compilation | `npm run compile` | Passed; 1 Solidity file compiled with solc 0.8.28 |
| Automated tests | `npm test` | Passed; 42 Mocha tests |
| Persistent local chain | `npm run local:node` | Passed; RPC started at `http://127.0.0.1:8545` |
| Deployment-only workflow | `npm run local:deploy` | Passed on chain ID 31337 |
| Full lifecycle workflow | `npm run local:demo` | Passed; `ACTIVE` after issuance and `REVOKED` after revocation |

The complete npm audit reported 24 advisories in the development-tooling
dependency tree (8 low, 2 moderate, and 14 high), while
`npm audit --omit=dev` reported none in production dependencies. These
development dependencies are used for local compilation and testing and should
be reviewed during future dependency maintenance; they do not change the
successful compile, test, or local demonstration results recorded here.

The local contract addresses and transaction hashes matched the deterministic
Hardhat development-chain sequence already recorded in
`STAGE8_DEMONSTRATION.md`. The temporary node was stopped after validation.
No public network, production signer, real document, or external system was
used.
