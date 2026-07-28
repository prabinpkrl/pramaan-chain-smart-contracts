# PramaanChain

PramaanChain is an Ethereum certificate-proof system. Authorized institutions
anchor SHA-256 document hashes, and anyone can check whether a matching proof
is active, revoked, or unknown. Certificate files and citizen personal data
remain off-chain.

This repository contains the complete prototype:

- a Solidity and Hardhat smart contract;
- a public Express blockchain gateway and event index;
- a private Express, SIWE, encrypted-SQLite application backend; and
- a React/Vite public verifier plus administrator, issuer, and citizen portals.

The project uses Ethereum Sepolia for application development. A teammate can
deploy a new contract from this repository and become the administrator of
that independent deployment; they do not need access to the original project
administrator wallet.

## Start here

| Goal | Guide |
| --- | --- |
| Deploy and run an independent Sepolia demo after cloning | [`docs/demo.md`](docs/demo.md) |
| Understand components and trust boundaries | [`docs/system-architecture.md`](docs/system-architecture.md) |
| Browse every current and historical document | [`docs/README.md`](docs/README.md) |
| Configure the complete application | [`docs/FRONTEND_APPLICATION.md`](docs/FRONTEND_APPLICATION.md) |
| Use the public blockchain API | [`docs/BACKEND_API.md`](docs/BACKEND_API.md) |
| Understand the contract interface | [`docs/CONTRACT_DESIGN.md`](docs/CONTRACT_DESIGN.md) |

The independent demo guide is the recommended onboarding path for a teammate,
reviewer, or mentor.

## Requirements

- Git
- Node.js `22.13.0` or newer
- npm
- A browser wallet that supports Sepolia
- A Sepolia RPC endpoint
- Two new test-only Ethereum accounts for an independent deployment
- Sepolia ETH for those test-only accounts
- An Etherscan API key if source verification is required

Docker is not used in the current workflow.

Never use a personal or mainnet wallet. Never commit or share a private key or
seed phrase.

## Clone and install

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts

npm ci
npm --prefix backend ci
npm --prefix app-backend ci
npm --prefix __frontend ci
```

Each component has its own lockfile and dependency installation.

## Verify the repository

Run the contract checks:

```bash
npm run compile
npm test
```

Run the service and frontend checks:

```bash
npm --prefix backend test
npm --prefix app-backend test
npm --prefix __frontend run lint
npm --prefix __frontend test
npm --prefix __frontend run build
```

Compilation generates the contract artifact and ABI at:

```text
artifacts/contracts/PramaanChain.sol/PramaanChain.json
```

Generated artifacts, dependencies, databases, build output, keystore material,
and `.env` files are ignored by Git.

## Independent Sepolia deployment

The checked deployment command uses two signers:

1. account 0 deploys the contract and receives `ADMIN_ROLE`;
2. account 1 is authorized as an issuer.

It then issues and revokes one synthetic proof so the complete lifecycle is
checked against the new deployment:

```bash
npm run sepolia:deploy-demo
```

This command sends four Sepolia transactions and requires deliberate
test-wallet and RPC configuration. Follow
[`docs/demo.md`](docs/demo.md) before running it. The guide uses Hardhat's
encrypted keystore by default and explains the optional gitignored `.env`
fallback.

The command reports the new contract address, deployment block, administrator,
issuer, transaction hashes, and checked statuses. Use that new address and
block in every component's local environment configuration.

## Configure the application

After deploying an independent contract, create these ignored files:

```bash
cp backend/.env.example backend/.env
cp app-backend/.env.example app-backend/.env
cp __frontend/.env.example __frontend/.env
```

The same deployment values must be used everywhere:

| Value | Gateway | Application backend | Frontend |
| --- | --- | --- | --- |
| Chain ID `11155111` | `BLOCKCHAIN_CHAIN_ID` | `BLOCKCHAIN_CHAIN_ID` | `VITE_CHAIN_ID` |
| New contract address | `PRAMAAN_CHAIN_ADDRESS` | `PRAMAAN_CHAIN_ADDRESS` | `VITE_CONTRACT_ADDRESS` |
| Deployment block | `PRAMAAN_CHAIN_START_BLOCK` | Not used | Not used |
| Sepolia RPC | `SEPOLIA_RPC_URL` | `SEPOLIA_RPC_URL` | Never exposed |

The gateway should remain read-only for the browser-wallet application:

```dotenv
ISSUER_ADDRESS=
ISSUER_PRIVATE_KEY=
WRITE_API_KEY=
```

Administrator and issuer writes are signed by the selected browser or mobile
wallet. No administrator or issuer key belongs in either application backend
or the frontend.

The private application backend additionally requires a new local
`APP_DATA_ENCRYPTION_KEY`. The frontend may use
`VITE_WALLETCONNECT_PROJECT_ID` to enable mobile-wallet QR login. All
`VITE_*` values are public browser configuration.

See [`docs/demo.md`](docs/demo.md) for exact values and setup order.

## Run the complete application

After the three component `.env` files are configured, open three terminals
from the repository root.

Terminal 1 — public blockchain gateway:

```bash
npm --prefix backend start
```

Terminal 2 — private application backend:

```bash
npm --prefix app-backend start
```

Terminal 3 — frontend:

```bash
npm --prefix __frontend run dev
```

Open:

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Gateway health | <http://localhost:3000/api/health> |
| Application health | <http://localhost:4000/api/health> |

The startup order matters because both backends validate the configured
network and deployed bytecode before serving the application.

## Application walkthrough

For a newly deployed contract:

1. Sign in with the administrator account that deployed the contract.
2. Open **Institutions and issuers** and register an institution with the
   authorized issuer address reported by the deployment command.
3. Change to the issuer account and sign in to the issuer workspace.
4. Use a separate wallet as a citizen, connect it to the institution's public
   ID, and submit a certificate request.
5. Return to the issuer account, hash the exact certificate file in the
   browser, and sign the issuance transaction.
6. Verify the same file or its SHA-256 hash through the public verifier.

Citizen login and public verification do not require gas. Issuance,
revocation, and administrator authorization are Sepolia transactions.

## Local contract development

For contract development without Sepolia, start a local Hardhat network:

```bash
npm run local:node
```

In another terminal:

```bash
npm run local:deploy
# or
npm run local:demo
```

Local Hardhat accounts and state disappear when the local node is reset. Never
reuse its printed development private keys on Sepolia or mainnet.

## Main commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Compile Solidity and generate the ABI artifact |
| `npm test` | Run contract tests |
| `npm run coverage` | Run Solidity coverage |
| `npm run local:node` | Start a persistent local Hardhat node |
| `npm run local:deploy` | Deploy a fresh contract locally |
| `npm run local:demo` | Run the checked local lifecycle |
| `npm run sepolia:deploy-demo` | Deploy and exercise an independent Sepolia contract |
| `npm run sepolia:verify -- <address>` | Verify source for a Sepolia deployment |
| `npm --prefix backend start` | Start the public gateway |
| `npm --prefix app-backend start` | Start the private application backend |
| `npm --prefix __frontend run dev` | Start the frontend development server |

## Documentation

### Architecture and integration

- [System architecture](docs/system-architecture.md)
- [Contract design](docs/CONTRACT_DESIGN.md)
- [Contract-to-backend handoff](docs/BACKEND_HANDOFF.md)
- [Cryptography and blockchain boundary](docs/CRYPTOGRAPHY_ENGINE.md)

### Application and APIs

- [Independent Sepolia demo](docs/demo.md)
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
- Browser hashing uses the exact file bytes and sends only the digest.
- The application backend derives roles from current blockchain and private
  database state; it never trusts a frontend-selected role.
- Public-network writes must use synthetic data and test-only wallets.
- Ethereum mainnet and production deployment remain outside this prototype.

The complete boundary is defined in
[`docs/system-architecture.md`](docs/system-architecture.md).
