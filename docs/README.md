# PramaanChain Documentation

This index separates current operational documentation from historical
completion evidence. Historical records preserve the commands, versions,
addresses, test counts, and outputs captured at the time; use the current
guides for present-day setup and integration.

## Current operational documentation

| Document | Purpose |
| --- | --- |
| [`../README.md`](../README.md) | Repository overview, setup, roles, deployment identity, and boundaries |
| [`demo.md`](demo.md) | Fresh-clone independent Sepolia deployment and full npm application startup |
| [`system-architecture.md`](system-architecture.md) | Architecture source of truth, trust boundaries, actors, and flows |
| [`CONTRACT_DESIGN.md`](CONTRACT_DESIGN.md) | Contract interface, roles, errors, events, and state transitions |
| [`BACKEND_API.md`](BACKEND_API.md) | Public blockchain gateway configuration and REST API |
| [`BACKEND_SAMPLES.md`](BACKEND_SAMPLES.md) | Gateway request and response examples |
| [`BACKEND_HANDOFF.md`](BACKEND_HANDOFF.md) | Contract-to-gateway integration reference |
| [`FRONTEND_APPLICATION.md`](FRONTEND_APPLICATION.md) | Private application setup, SIWE, relationships, and API |
| [`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md) | Implemented browser, wallet, institution, issuance, and verification flows |
| [`CRYPTOGRAPHY_ENGINE.md`](CRYPTOGRAPHY_ENGINE.md) | Cryptographic and blockchain service boundary |
| [`../__frontend/README.md`](../__frontend/README.md) | Frontend-specific setup and trust boundaries |

The architecture source of truth is
[`system-architecture.md`](system-architecture.md) and is versioned with the
implementation it describes.

## Historical evidence

| Document | Recorded evidence |
| --- | --- |
| [`STAGE8_DEMONSTRATION.md`](STAGE8_DEMONSTRATION.md) | Local deployment and synthetic lifecycle |
| [`STAGE9_VALIDATION.md`](STAGE9_VALIDATION.md) | Clean-install and handoff validation |
| [`SEPOLIA_PREPARATION.md`](SEPOLIA_PREPARATION.md) | Stage 10 preparation requirements used before deployment |
| [`STAGE10_VALIDATION.md`](STAGE10_VALIDATION.md) | Pre-deployment validation and independent review |
| [`SEPOLIA_DEPLOYMENT.md`](SEPOLIA_DEPLOYMENT.md) | Stage 11 Sepolia deployment and verification evidence |
| [`CRYPTOGRAPHY_ENGINE_PROTOTYPE.md`](CRYPTOGRAPHY_ENGINE_PROTOTYPE.md) | Compact historical engine overview |

The deployed Sepolia address remains
`0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` on chain ID `11155111`.
Historical documentation does not authorize another deployment or any new
public-network transaction.
