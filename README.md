# PramaanChain

PramaanChain is an Ethereum certificate-proof system. Authorized institutions
anchor SHA-256 document hashes, and anyone can check whether a matching proof
is active, revoked, or unknown. Certificate files and citizen personal data
remain off-chain.

This repository contains:

- a Solidity and Hardhat smart contract;
- a public Express blockchain gateway and event index;
- a private Express, SIWE, encrypted-SQLite application backend; and
- a React/Vite public verifier plus administrator, issuer, and citizen portals.

The recommended local workflow uses Docker Compose. A teammate can either
deploy a separate Sepolia contract with their own test-only administrator
wallet, or validate and use an existing deployment. Issuers are authorized
later through the administrator dashboard. The normal application containers
never receive a wallet private key.

## Start here

| Goal | Guide |
| --- | --- |
| Deploy or import a contract and run the complete application | [`docs/demo.md`](docs/demo.md) |
| Understand components and trust boundaries | [`docs/system-architecture.md`](docs/system-architecture.md) |
| Browse all documentation | [`docs/README.md`](docs/README.md) |
| Configure the private application and API | [`docs/FRONTEND_APPLICATION.md`](docs/FRONTEND_APPLICATION.md) |
| Use the public blockchain gateway | [`docs/BACKEND_API.md`](docs/BACKEND_API.md) |
| Understand the contract interface | [`docs/CONTRACT_DESIGN.md`](docs/CONTRACT_DESIGN.md) |

## Requirements

For the recommended workflow:

- Git
- Docker Engine with the Compose plugin
- a Sepolia RPC endpoint
- a dedicated, test-only administrator account with enough Sepolia ETH if
  deploying a new contract
- an optional Etherscan API key for source verification

Node.js `22.13.0` or newer and npm are needed only for the manual development
workflow. Never use a personal or mainnet wallet, and never commit or share a
private key or seed phrase.

## Quick start with an existing deployment

Clone the repository and prepare the ignored Docker configuration:

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts
cp .env.docker.example .env.docker
```

Copy the full commit printed by `git rev-parse HEAD` into `SOURCE_COMMIT` in
`.env.docker`. The commit must already be pushed to this GitHub repository:
the one-shot contract image is built from that exact remote revision and
records it as image and deployment provenance. Also set `SEPOLIA_RPC_URL` and
the three `IMPORT_*` values, then run the read-only validator:

```bash
docker compose --env-file .env.docker --profile deploy run --rm configure-existing
docker compose --env-file .env.docker up --build -d
```

The import checks Sepolia chain ID `11155111`, exact runtime bytecode, the
successful contract-creation receipt in the supplied deployment block, the
administrator role, and the recorded administrator address. It sends no
transaction and does not require an issuer.

Open:

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Gateway health | <http://localhost:3000/api/health> |
| Private application health | <http://localhost:4000/api/health> |

Inspect or stop the stack with:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker down
```

## Deploy a teammate-owned Sepolia contract

The deployment phase is deliberately separate from application startup. It
sends exactly one transaction: deploy `PramaanChain` from the administrator
wallet. Issuer authorization is a later browser-wallet action.

Store only the administrator key in the persistent, encrypted Hardhat
keystore volume:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

Optionally store an Etherscan key:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npx hardhat keystore set ETHERSCAN_API_KEY
```

Run the checked deployment:

```bash
docker compose --env-file .env.docker --profile deploy run --rm deploy-contract
```

Before sending a transaction, this command compiles the production profile and
runs the contract tests. It writes public runtime metadata and transaction
evidence to the named `deployment_state` Docker volume. The files are shared
read-only with the application containers and are not affected by the host
user's UID.

Inspect the public metadata without exposing the keystore:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npm run docker:export-deployment
```

If runtime metadata already exists, do not deploy again. Start the application
directly:

```bash
docker compose --env-file .env.docker up --build -d
```

If source verification was skipped, add the Etherscan key and run:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npm run sepolia:verify -- <CONTRACT_ADDRESS>
```

If deployment was interrupted after submission, export and inspect the
recorded evidence first. Recovery resolves the recorded deployment transaction
and never sends another one:

```bash
docker compose --env-file .env.docker --profile deploy run --rm resume-deployment
```

It finalizes a successful deployment after validating its exact bytecode,
receipt, block and administrator role. Pending, failed, inconsistent or
ambiguous evidence is reported without another transaction. See the recovery
procedure in the demo guide.

Follow the complete safety checks and troubleshooting procedure in
[`docs/demo.md`](docs/demo.md).

## Docker trust and persistence

- `contract-tools`, `deploy-contract`, `resume-deployment`, and
  `configure-existing` are one-shot services behind the `deploy` profile.
- The administrator key and optional Etherscan key exist only in the encrypted
  `hardhat_keystore` Docker volume used by those services.
- The gateway runs read-only; its issuer key and write API key are explicitly
  blank.
- The private backend generates a random application-data encryption key on
  first start and stores it beside its SQLite database in the `app_data`
  volume.
- The frontend receives only public runtime configuration.
- Published ports bind to `127.0.0.1` by default. Non-local access requires a
  separately reviewed HTTPS ingress and secure cookies.
- Long-running containers use read-only filesystems, dropped capabilities,
  `no-new-privileges`, and non-root users.
- `docker compose down` preserves database and keystore volumes.
- `docker compose --profile deploy down -v` permanently removes the local
  database, application encryption key, gateway state, public deployment
  evidence, and encrypted deployment keystore. It does not change anything
  already deployed on Sepolia.

## Application walkthrough

For a newly deployed contract:

1. Sign in with the administrator wallet that deployed the contract.
2. Open **Institutions and issuers**, enter the institution and its primary
   issuer address, and approve the issuer-authorization transaction.
3. Change to the issuer wallet and sign in to its workspace.
4. Use another wallet as a citizen, connect it to the institution's public ID,
   and submit a certificate request.
5. Return to the issuer, hash the exact certificate file in the browser, and
   sign the issuance transaction.
6. Verify the same file or SHA-256 hash through the public verifier.

Citizen login and public verification do not require gas. Issuance,
revocation, and administrator authorization are Sepolia transactions.

## Manual npm development

Docker is recommended for the full application. For direct development:

```bash
npm ci
npm --prefix backend ci
npm --prefix app-backend ci
npm --prefix __frontend ci

npm run compile
npm test
npm --prefix backend test
npm --prefix app-backend test
npm --prefix __frontend run lint
npm --prefix __frontend test
npm --prefix __frontend run build
```

Create the component `.env` files from their examples, then start the gateway,
application backend, and frontend in separate terminals:

```bash
npm --prefix backend start
npm --prefix app-backend start
npm --prefix __frontend run dev
```

For local contract work, use:

```bash
npm run local:node
npm run local:deploy
# or: npm run local:demo
```

The older `npm run sepolia:deploy-demo` command performs a complete synthetic
four-transaction lifecycle and alone requires a separate issuer key. The
normal Docker onboarding flow uses `sepolia:deploy` and sends only the contract
deployment transaction.

## Main commands

| Command | Purpose |
| --- | --- |
| `docker compose --env-file .env.docker up --build -d` | Build and start the application |
| `docker compose --env-file .env.docker --profile deploy run --rm deploy-contract` | Test, deploy with the administrator, and optionally verify |
| `docker compose --env-file .env.docker --profile deploy run --rm resume-deployment` | Resolve and finalize an interrupted deployment without another write |
| `docker compose --env-file .env.docker --profile deploy run --rm configure-existing` | Validate and import an existing deployment without a write |
| `npm run compile` | Compile Solidity and generate the ABI artifact |
| `npm test` | Run contract tests |
| `npm run coverage` | Run Solidity coverage |
| `npm run local:node` | Start a persistent local Hardhat node |
| `npm run local:deploy` | Deploy a fresh contract locally |
| `npm run local:demo` | Run the checked local lifecycle |
| `npm run sepolia:deploy` | Deploy with the administrator only |
| `npm run sepolia:deploy-demo` | Optional two-wallet synthetic lifecycle |
| `npm run sepolia:verify -- <address>` | Verify source on Etherscan |

## Documentation

### Architecture and integration

- [System architecture](docs/system-architecture.md)
- [Contract design](docs/CONTRACT_DESIGN.md)
- [Contract-to-backend handoff](docs/BACKEND_HANDOFF.md)
- [Cryptography and blockchain boundary](docs/CRYPTOGRAPHY_ENGINE.md)

### Application and APIs

- [Independent Docker demo](docs/demo.md)
- [Application setup and private API](docs/FRONTEND_APPLICATION.md)
- [Frontend implementation](docs/FRONTEND_INTEGRATION.md)
- [Frontend package guide](__frontend/README.md)
- [Public gateway API](docs/BACKEND_API.md)
- [Gateway examples](docs/BACKEND_SAMPLES.md)

### Historical evidence

- [Local lifecycle evidence](docs/STAGE8_DEMONSTRATION.md)
- [Clean-install validation](docs/STAGE9_VALIDATION.md)
- [Sepolia preparation record](docs/SEPOLIA_PREPARATION.md)
- [Independent readiness validation](docs/STAGE10_VALIDATION.md)
- [Original Sepolia deployment evidence](docs/SEPOLIA_DEPLOYMENT.md)

Historical evidence describes the original reviewed deployment. It is not the
configuration for a teammate's independent deployment.

## Security and privacy

- Only a SHA-256 document digest and necessary blockchain metadata are public.
- Certificate contents, names, addresses, marks, and citizen relationships
  must never be stored on-chain.
- Wallet connection is not authentication; login requires a separate SIWE
  signature.
- Browser hashing uses exact file bytes and sends only the digest.
- The backend derives roles from current blockchain and private database
  state; it never trusts a frontend-selected role.
- Public-network writes must use synthetic data and test-only wallets.
- Ethereum mainnet and production deployment remain outside this prototype.

The complete boundary is defined in
[`docs/system-architecture.md`](docs/system-architecture.md).
