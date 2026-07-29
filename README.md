# PramaanChain

Privacy-conscious certificate verification on Ethereum Sepolia.

PramaanChain lets authorized institutions anchor a SHA-256 document proof
on-chain. Anyone can later check whether the matching proof is **active**,
**revoked**, or **not found** without uploading the certificate or publishing
citizen personal data.

> [!IMPORTANT]
> PramaanChain is a fellowship prototype for Sepolia testnet. It is not
> production infrastructure and must not be used with real certificates,
> personal wallets, mainnet funds, or personal information.

## Project status

| Item | Current state |
| --- | --- |
| Network | Ethereum Sepolia (`11155111`) |
| Reference contract | [`0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |
| Contract source | Verified on Etherscan |
| Application | Dockerized frontend, private backend, and read-only gateway |
| Production deployment | Not implemented or authorized |

The Docker workflow can validate the reference deployment or configure a
separate approved Sepolia contract.

## Why PramaanChain?

- **Document privacy:** exact files stay in the browser; only their SHA-256
  digest is anchored.
- **Public verification:** verification uses read-only contract calls and
  requires no wallet or gas.
- **Permanent status:** issued proofs cannot be edited, and revocation is
  irreversible.
- **Explicit authority:** administrators manage issuers; only authorized
  issuers can issue proofs.
- **Private relationships:** citizen assignments and institution records stay
  in encrypted SQLite storage rather than on-chain.
- **User-controlled writes:** administrator and issuer transactions are signed
  by the selected browser wallet.

## System overview

| Component | Location | Default URL | Responsibility |
| --- | --- | --- | --- |
| Smart contract | `contracts/` | Sepolia | Issuer authorization, issuance, revocation, and verification status |
| Public gateway | `backend/` | <http://localhost:3000> | Read-only contract API and event index |
| Private backend | `app-backend/` | <http://localhost:4000> | SIWE sessions, encrypted relationships, requests, and receipt confirmation |
| Web application | `__frontend/` | <http://localhost:5173> | Public verifier and administrator, issuer, and citizen portals |

The implementation uses Solidity `0.8.28`, Hardhat 3, OpenZeppelin
`AccessControl`, ethers v6, Express, SIWE, SQLite, React, Vite, Nginx, and
Docker Compose.

### Roles

| Role | Main actions |
| --- | --- |
| Administrator | Deploy a contract, authorize or remove issuers, and perform emergency revocation |
| Issuer | Review requests, hash certificate files locally, issue proofs, and revoke its proofs |
| Citizen | Connect a wallet, request a certificate, and view privately assigned proofs |
| Verifier | Verify a file or SHA-256 hash without signing in |

## Quick start

### Prerequisites

- Git
- Docker Engine with the Compose plugin
- A Sepolia RPC endpoint with historical `eth_getLogs` support
- A modern browser with a Sepolia-compatible wallet

Node.js `22.13.0` or newer is required only for direct npm development.

### 1. Clone and configure

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts
cp .env.docker.example .env
```

Docker Compose loads `.env` automatically. Set:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc.example
PUBLIC_APP_URL=http://localhost:5173
SIWE_DOMAIN=localhost:5173
SOURCE_COMMIT=REPLACE_WITH_PUSHED_FULL_GIT_COMMIT_SHA
```

Use the complete output of `git rev-parse HEAD` for `SOURCE_COMMIT`. The commit
must already exist in the configured GitHub repository.

### 2. Configure one contract

Choose one path.

#### Use an existing deployment

Add the deployment identity to `.env`:

```dotenv
IMPORT_CONTRACT_ADDRESS=0xYourContractAddress
IMPORT_DEPLOYMENT_BLOCK=12345678
IMPORT_ADMINISTRATOR_ADDRESS=0xAdministratorAddress
```

Validate and import it without sending a transaction:

```bash
docker compose --profile deploy run --rm configure-existing
```

#### Deploy a new Sepolia contract

Use only a dedicated, test-only administrator wallet. The keystore command
prompts for the private key; the key is not part of the command or shell
history.

```bash
docker compose --profile deploy build contract-tools
docker compose --profile deploy run --rm contract-tools \
  npx hardhat keystore set DEPLOYER_PRIVATE_KEY
docker compose --profile deploy run --rm deploy-contract
```

This path sends exactly one Sepolia deployment transaction. See the
[Docker demo](docs/DOCKER_DEMO.md) for test-ETH faucets, optional Etherscan
verification, and interrupted-deployment recovery.

### 3. Start the application

```bash
docker compose up --build -d
docker compose ps
```

Normal `docker compose up` starts only the gateway, private backend, and
frontend. It cannot deploy a contract because deployment services require the
explicit `deploy` profile.

Open:

- Application: <http://localhost:5173>
- Gateway health: <http://localhost:3000/api/health>
- Private backend health: <http://localhost:4000/api/health>

Later starts require only:

```bash
docker compose up -d
```

## Application flow

1. Sign in with the administrator wallet.
2. Register an institution and authorize its issuer wallet.
3. Sign in with the funded issuer wallet.
4. Connect a separate citizen wallet and request a certificate.
5. Issue a synthetic certificate proof from the issuer portal.
6. Verify the original file or its SHA-256 hash through the public verifier.

The administrator needs Sepolia ETH for issuer management. The issuer needs
Sepolia ETH for issuance and revocation. Public verification is read-only and
requires no ETH.

## Common commands

| Command | Purpose |
| --- | --- |
| `docker compose up --build -d` | Build and start the application |
| `docker compose up -d` | Start without rebuilding or deploying |
| `docker compose ps` | Check container health |
| `docker compose logs -f` | Follow application logs |
| `docker compose down` | Stop containers while preserving volumes |
| `docker compose --profile deploy run --rm configure-existing` | Validate and import an existing contract |
| `docker compose --profile deploy run --rm deploy-contract` | Deploy a new contract after keystore setup |
| `docker compose --profile deploy run --rm resume-deployment` | Resolve an interrupted deployment without resubmitting |

`docker compose --profile deploy down -v` is destructive: it removes the local
database, encryption key, gateway index, deployment evidence, and encrypted
Hardhat keystore. It does not alter Sepolia.

## Development and testing

Install all workspaces:

```bash
npm ci
npm --prefix backend ci
npm --prefix app-backend ci
npm --prefix __frontend ci
```

Run the automated checks:

```bash
npm run compile
npm test
npm --prefix backend test
npm --prefix app-backend test
npm --prefix __frontend test
npm --prefix __frontend run lint
npm --prefix __frontend run build
```

Useful local-contract commands:

```bash
npm run local:node
npm run local:deploy
npm run local:demo
```

## Security and privacy

- Never commit or expose a private key, seed phrase, API key, credentialed RPC
  URL, or keystore.
- Use dedicated test-only wallets and Sepolia ETH.
- Never store certificate contents, names, identifiers, contact details,
  marks, addresses, or detailed revocation reasons on-chain.
- Wallet connection alone is not authentication; protected sessions use SIWE.
- Browser hashing uses exact file bytes and sends only the `bytes32` digest.
- The normal application containers do not receive administrator or issuer
  private keys.
- Production deployment requires a separate threat model, professional audit,
  organization-managed key custody, HTTPS infrastructure, and explicit
  approval.

Report security-sensitive problems privately to the repository maintainer
rather than including secrets or personal data in a public issue.

## Documentation

| Guide | Purpose |
| --- | --- |
| [Documentation index](docs/README.md) | All current project documentation |
| [Docker demo](docs/DOCKER_DEMO.md) | Complete deploy/import and application walkthrough |
| [System architecture](docs/SYSTEM_ARCHITECTURE.md) | Source of truth for components, trust boundaries, and flows |
| [Backend architecture](docs/BACKEND_ARCHITECTURE.md) | Public gateway, private backend, data model, authentication, and transaction confirmation |
| [Backend API](docs/BACKEND_API.md) | All implemented gateway and application GET and POST endpoints |
| [Frontend architecture](docs/FRONTEND_ARCHITECTURE.md) | Routes, API clients, wallet signing, hashing, and UI flows |
| [Smart contract](docs/CONTRACT.md) | Roles, functions, events, errors, privacy rules, and lifecycle |
| [Archived evidence](docs/archive/README.md) | Historical roadmap and deployment records |

## License

This repository does not currently include an open-source license.
