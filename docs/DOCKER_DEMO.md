# PramaanChain Docker Demo

This guide configures one Sepolia contract and starts the PramaanChain app.
Choose exactly one contract setup path. Normal application startup never
deploys a contract.

## 1. Configure

Required:

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts
cp .env.docker.example .env
```

Set these values in `.env`:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc.example
PUBLIC_APP_URL=http://localhost:5173
SIWE_DOMAIN=localhost:5173
SOURCE_COMMIT=REPLACE_WITH_PUSHED_FULL_GIT_COMMIT_SHA
```

Get the full commit:

```bash
git rev-parse HEAD
```

`SOURCE_COMMIT` must be pushed to the configured GitHub repository.
Do not put wallet private keys in `.env`. Docker Compose reads `.env` for
configuration but does not forward `DEPLOYER_PRIVATE_KEY` to containers.

### Required Sepolia test ETH

Get free Sepolia ETH from the
[Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia).
The [ethereum.org Sepolia page](https://ethereum.org/developers/docs/networks/#sepolia)
lists additional faucets if needed.

Fund both test wallets before the demo:

- **Administrator wallet:** pays gas to deploy a new contract and to authorize
  or remove issuers.
- **Issuer wallet:** pays gas to issue and revoke documents. A confirmed issue
  transaction makes the document publicly verifiable.

Public verification is read-only and requires no ETH. Always request and send
test ETH on the Sepolia network, never Ethereum mainnet.

## 2. Configure the contract once

Choose **A** or **B**, not both.

### A. Existing contract

No private key or blockchain transaction is required.

Add to `.env`:

```dotenv
IMPORT_CONTRACT_ADDRESS=0xYourContractAddress
IMPORT_DEPLOYMENT_BLOCK=12345678
IMPORT_ADMINISTRATOR_ADDRESS=0xAdministratorAddress
```

Required once for a fresh Docker volume:

```bash
docker compose --profile deploy run --rm configure-existing
```

### B. New contract

This path sends exactly one Sepolia transaction. Use a dedicated test-only
administrator wallet with enough Sepolia ETH.

Required preparation:

```bash
docker compose --profile deploy build contract-tools
docker compose --profile deploy run --rm contract-tools \
  npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

The keystore command prompts for the private key and keystore password. The
encrypted key stays in the `hardhat_keystore` Docker volume and is not given to
the frontend, gateway, or application backend.

Optional — enable automatic Etherscan source verification before deployment:

```bash
docker compose --profile deploy run --rm contract-tools \
  npx hardhat keystore set ETHERSCAN_API_KEY
```

Required deployment:

```bash
docker compose --profile deploy run --rm deploy-contract
```

Conditional — only if deployment was interrupted after submission:

```bash
docker compose --profile deploy run --rm contract-tools \
  npm run docker:export-deployment
docker compose --profile deploy run --rm resume-deployment
```

Do not rerun `deploy-contract` after an interrupted submission.

## 3. Start the application

Required after either contract path:

```bash
docker compose up --build -d
docker compose ps
```

Open:

- Frontend: <http://localhost:5173>
- Gateway health: <http://localhost:3000/api/health>
- Application backend health: <http://localhost:4000/api/health>

Later starts do not need the contract setup command:

```bash
docker compose up -d
```

Optional — view logs:

```bash
docker compose logs --tail=100 gateway app-backend frontend
```

Stop the application while preserving data:

```bash
docker compose down
```

## 4. Application demo

1. Sign in with the administrator wallet.
2. Register an institution and authorize its issuer wallet.
3. Sign in with the issuer wallet.
4. Connect a citizen wallet and submit a certificate request.
5. Issue and verify a synthetic certificate.

Issuer authorization, issuance, and revocation require explicit browser-wallet
approval. Public verification and sign-in do not require gas.

## 5. Optional cleanup

Destructive — remove containers and all local Docker volumes:

```bash
docker compose --profile deploy down -v
```

This deletes the local database, encryption key, index state, deployment
evidence, and encrypted Hardhat keystore. It does not alter Sepolia.
