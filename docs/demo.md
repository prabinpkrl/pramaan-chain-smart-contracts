# Docker Demo: Deploy or Import, Then Run PramaanChain

This guide starts from a fresh clone and runs the complete PramaanChain
prototype with Docker Compose. It supports two safe paths:

- deploy a new Sepolia contract controlled by your own test-only
  administrator and issuer wallets; or
- import and validate an existing Sepolia deployment without sending a
  transaction.

The deployment phase is separate from application startup. Once a contract is
configured in the named `deployment_state` Docker volume, future starts only
run the application and do not redeploy.

This is a Sepolia prototype, not production infrastructure.

## 1. What Docker runs

The default Compose stack contains three long-running services:

| Service | Local port | Responsibility |
| --- | ---: | --- |
| `frontend` | `5173` | Nginx-hosted React application and public runtime configuration |
| `gateway` | `3000` | Read-only blockchain API and event index |
| `app-backend` | `4000` | SIWE, encrypted private relationships, requests, and receipt checks |

Deployment tools are one-shot services under the `deploy` profile. They are
not started by a normal `docker compose up`.

The normal services receive public chain configuration and the RPC endpoint.
They never receive the administrator private key, issuer private key, or
Etherscan API key.

## 2. Prerequisites

- Git
- Docker Engine and `docker compose`
- a Sepolia RPC endpoint
- a modern browser
- a Sepolia-compatible wallet for application use

For a new deployment, also prepare:

- a new test-only administrator/deployer wallet;
- a different new test-only issuer wallet;
- enough Sepolia ETH for deployment and authorization; and
- optionally, an Etherscan API key.

Never use a personal or mainnet wallet. Never paste a seed phrase into this
project.

Check the tools:

```bash
git --version
docker --version
docker compose version
```

## 3. Clone and configure Docker

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set at least:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc.example
PUBLIC_APP_URL=http://localhost:5173
SIWE_DOMAIN=localhost:5173
SOURCE_COMMIT=0123456789abcdef0123456789abcdef01234567
```

`SEPOLIA_RPC_URL` may contain a provider credential, so `.env.docker` is
ignored by Git. Do not put wallet private keys in this file.

Replace the example `SOURCE_COMMIT` with the output of:

```bash
git rev-parse HEAD
```

It must be a full, nonzero 40-character SHA that is already pushed to this
GitHub repository. Keep the working tree clean for a deployment. The
contract-tools build uses that exact remote commit, applies an OCI revision
label, requests BuildKit provenance, and refuses to run when its embedded
revision differs from `SOURCE_COMMIT`. This binds deployment evidence to
source that teammates can retrieve and review.

Optional public settings include:

```dotenv
VITE_WALLETCONNECT_PROJECT_ID=
BIND_ADDRESS=127.0.0.1
FRONTEND_PORT=5173
GATEWAY_PORT=3000
APP_BACKEND_PORT=4000
COOKIE_SECURE=false
```

WalletConnect mobile QR login is unavailable when its project ID is blank;
injected browser wallets and the installation guide remain available.
Keep `BIND_ADDRESS=127.0.0.1` and `COOKIE_SECURE=false` for local HTTP. A
non-loopback deployment requires an explicitly reviewed HTTPS ingress,
`COOKIE_SECURE=true`, and matching public URLs; the backend refuses insecure
cookies on a non-local origin.

Choose exactly one of the next two paths.

## 4A. Use an existing contract without a transaction

Use this path when the contract is already deployed and its issuer is already
authorized. Add its public identity to `.env.docker`:

```dotenv
IMPORT_CONTRACT_ADDRESS=0xYourContractAddress
IMPORT_DEPLOYMENT_BLOCK=12345678
IMPORT_ADMINISTRATOR_ADDRESS=0xAdministratorAddress
IMPORT_ISSUER_ADDRESS=0xAuthorizedIssuerAddress
```

Run:

```bash
docker compose --env-file .env.docker --profile deploy run --rm configure-existing
```

This command performs only read calls. It checks:

1. the RPC reports Sepolia chain ID `11155111`;
2. live runtime bytecode exactly matches this repository's compiled contract;
3. the contract's successful creation receipt exists in the exact supplied
   deployment block;
4. the supplied administrator holds `ADMIN_ROLE`; and
5. the supplied issuer is currently authorized.

Do not guess the deployment block when importing a contract.

On success, the command writes validated public runtime and evidence files to
the named `deployment_state` Docker volume. It never writes a wallet secret.

Inspect the generated public data with:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npm run docker:export-deployment
```

Continue at [Start the application](#6-start-the-application).

## 4B. Deploy and authorize a new contract

### Transaction scope

This path sends exactly two Sepolia transactions:

1. deploy `PramaanChain` from the administrator wallet; and
2. authorize the separate issuer wallet from the administrator wallet.

It does not issue or revoke a proof. Those actions remain deliberate
application demonstrations signed by the selected browser wallet.

### Store deployment secrets

Build the deployment tool image:

```bash
docker compose --env-file .env.docker --profile deploy build contract-tools
```

Store the two wallet private keys in Hardhat's encrypted keystore. Each command
prompts for the value and the keystore password:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npx hardhat keystore set DEPLOYER_PRIVATE_KEY

docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npx hardhat keystore set ISSUER_PRIVATE_KEY
```

The first signer becomes the administrator. The second signer is authorized
as the issuer. They must be different addresses.

For automatic Etherscan source verification, also run:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npx hardhat keystore set ETHERSCAN_API_KEY
```

These secrets are stored only in the named `hardhat_keystore` Docker volume.
They are not written to `.env.docker`, `deployment_state`, the frontend, or
either long-running backend.

### Pre-transaction checklist

Before continuing, confirm:

- both wallets are new, dedicated Sepolia test wallets;
- the deployer has enough Sepolia ETH;
- the issuer may have zero ETH until it signs an application write;
- the RPC is Sepolia, not mainnet or another chain;
- the named `deployment_state` volume does not already identify a deployment;
  use `npm run docker:export-deployment` to check; and
- the checked-out commit is the code you intend to deploy.

### Deploy

```bash
docker compose --env-file .env.docker --profile deploy run --rm deploy-contract
```

The command:

1. compiles the production Hardhat profile;
2. runs all contract tests;
3. validates chain ID `11155111` and two distinct signers;
4. deploys the contract and waits for a successful receipt;
5. validates deployed bytecode and the administrator role;
6. authorizes the issuer and waits for a successful receipt;
7. validates issuer authorization;
8. writes public runtime and evidence files; and
9. verifies source on Etherscan when its API key is configured.

Expected public evidence includes:

- contract address;
- deployment block;
- administrator and issuer addresses;
- deployment and authorization transaction hashes; and
- source-verification status.

Do not expose the contents of the encrypted keystore when sharing evidence.

### Interrupted deployment recovery

If the deployment receipt is confirmed but issuer authorization is missing or
ambiguous, do not rerun the deployment command. Inspect:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npm run docker:export-deployment
```

After confirming the recorded contract and wallets, run recovery:

```bash
docker compose --env-file .env.docker --profile deploy run --rm resume-authorization
```

Recovery never deploys another contract. It validates the exact deployed
bytecode, successful deployment receipt, deployment block, signer addresses,
administrator role, current issuer role, and the recorded authorization
transaction and nonce before deciding what to do:

- an active issuer is finalized without a transaction;
- a pending transaction is reported and never duplicated;
- an absent transaction whose nonce is still available is ambiguous and
  blocked;
- a successful receipt without the role is inconsistent and blocked; and
- only a failed receipt, or an absent transaction whose nonce is already
  consumed, is eligible for a deliberate retry.

When the evidence status becomes `AUTHORIZATION_RETRY_REQUIRED`, first inspect
the exported evidence and copy its recorded issuer-authorization transaction
hash. Then temporarily set both values in `.env.docker`:

```dotenv
ALLOW_AUTHORIZATION_RESUBMIT=true
AUTHORIZATION_RETRY_CONFIRMATION=0xExactRecordedAuthorizationTransactionHash
```

Rerun `resume-authorization` once. It will reject a missing or different hash.
After the retry is confirmed, reset the variables to `false` and blank. If
recovery reports `AUTHORIZATION_PENDING`, `AUTHORIZATION_AMBIGUOUS`, or
`AUTHORIZATION_INCONSISTENT`, do not enable retry; investigate the recorded
transaction and nonce first.

### Source verification retry

If deployment succeeds but Etherscan verification is skipped or fails, the
contract and runtime configuration remain valid. Configure the Etherscan key
if needed, then rerun only verification:

```bash
docker compose --env-file .env.docker --profile deploy run --rm contract-tools \
  npm run sepolia:verify -- <CONTRACT_ADDRESS>
```

Do not redeploy merely to retry source verification.

## 5. Understand generated state

The `runtime.env` file in the named `deployment_state` volume contains only
public values:

```dotenv
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=0x...
PRAMAAN_CHAIN_START_BLOCK=12345678
ADMINISTRATOR_ADDRESS=0x...
ISSUER_ADDRESS=0x...
```

Compose mounts this volume read-only into all three application services. It
prevents a contract address from being copied differently between components.
The files contain only public deployment metadata; application entrypoints
load only the allowlisted runtime values they require.

Use `npm run docker:export-deployment` through `contract-tools` to inspect or
archive the public runtime and evidence. Do not open or export the encrypted
keystore.

To deliberately replace local runtime metadata with a different validated
existing deployment, set `ALLOW_RUNTIME_OVERWRITE=true`, update the
`IMPORT_*` values, and rerun `configure-existing`. Leave
`ALLOW_RUNTIME_OVERWRITE=false` during normal operation.

`ALLOW_NEW_DEPLOYMENT=true` removes only the local guard against replacing
runtime metadata; it does not make another Sepolia deployment safe. Use it
only after deliberately archiving the existing public evidence and deciding
to create a separate contract.

## 6. Start the application

Build and start the default services:

```bash
docker compose --env-file .env.docker up --build -d
```

Check readiness:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=100 gateway app-backend frontend
```

Open:

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Gateway health | <http://localhost:3000/api/health> |
| Private backend health | <http://localhost:4000/api/health> |

All published ports bind to loopback by default. The application services use
read-only root filesystems, dropped Linux capabilities,
`no-new-privileges`, and non-root users. Writable data is limited to named
volumes and tightly scoped temporary filesystems.

The private backend creates a random encryption key on first start and stores
it with the SQLite database in the persistent `app_data` volume. Container
recreation therefore does not make existing encrypted rows unreadable.

The gateway may report a degraded event index if the selected RPC cannot query
historical logs from the deployment block. Direct contract verification is
separate and can remain healthy. Use an RPC with historical `eth_getLogs`
support for a complete index.

## 7. Test the running application

Confirm the landing page, login page, and verifier load. Then:

1. Sign in with the administrator wallet.
2. Register an institution using the authorized issuer address.
3. Switch to the issuer wallet and sign in.
4. Connect a separate citizen wallet and submit a certificate request.
5. Hash the exact certificate file in the issuer workspace.
6. Review the transaction in the wallet before signing issuance.
7. Wait for the private backend to confirm the receipt and active status.
8. Verify the same file or its SHA-256 hash through the public verifier.

The verifier hashes files in the browser; the original file is not uploaded.
Public verification and SIWE login require no gas. Issuance and revocation are
Sepolia transactions.

To run the browser E2E suite against the containers:

```bash
E2E_EXTERNAL_SERVER=1 E2E_BASE_URL=http://127.0.0.1:5173 \
  npm --prefix __frontend run test:e2e
```

This E2E command requires the frontend development dependencies on the host.
The application itself does not.

## 8. Restart and stop

Restart without deploying:

```bash
docker compose --env-file .env.docker up -d
```

Stop containers while preserving state:

```bash
docker compose --env-file .env.docker down
```

Remove containers and all local Docker volumes, including profile-gated
deployment state:

```bash
docker compose --env-file .env.docker --profile deploy down -v
```

`down -v` permanently removes the local SQLite database, its application
encryption key, gateway state, public deployment evidence, and the encrypted
Hardhat keystore. It does not remove or alter the Sepolia contract.

## 9. Troubleshooting

### Runtime state is missing

Run exactly one configuration phase:

- `configure-existing` for a deployed and authorized contract; or
- `deploy-contract` for a new teammate-owned contract.

Do not hand-edit generated runtime metadata.

### SOURCE_COMMIT is rejected or cannot be fetched

Use the complete output of `git rev-parse HEAD`, not a branch name, short SHA,
or `local`. Push that commit to the configured GitHub repository before
building the deployment profile. The remote, commit-pinned build is
intentional: a deployment must not claim unreviewable local changes.

### Runtime deployment already exists

The guard is preventing an accidental second deployment or inconsistent
import. If the recorded contract is correct, simply run the application.

### Wrong chain ID

The RPC is not Sepolia. Replace `SEPOLIA_RPC_URL`; never bypass the chain-ID
check.

### Historical state or logs are unavailable

Use a Sepolia RPC provider that supports `eth_getLogs` from the deployment
block. Full-range historical logs are required for the gateway index, although
the read-only import can validate a deployment from its block and transaction
receipts.

### WalletConnect QR is unavailable

Set a valid public `VITE_WALLETCONNECT_PROJECT_ID` in `.env.docker`, then
recreate the frontend:

```bash
docker compose --env-file .env.docker up --build -d frontend
```

### Port already in use

Change `FRONTEND_PORT`, `GATEWAY_PORT`, or `APP_BACKEND_PORT` in
`.env.docker`. If the browser-facing backend ports change, update the frontend
runtime URLs in `compose.yaml` or expose matching local ports.

## 10. Manual npm alternative

Direct npm development remains supported and is useful while changing code.
Install each workspace, copy each component's `.env.example`, run its tests,
and start the three processes separately. The exact commands are summarized
in the [root README](../README.md).

The legacy `npm run sepolia:deploy-demo` command sends four transactions for a
full synthetic deploy/authorize/issue/revoke lifecycle. The Docker onboarding
path intentionally sends only deploy and authorize.

## 11. Completion checklist

A teammate has completed this guide when:

- the selected Sepolia contract identity is validated;
- the administrator and issuer are different test-only wallets;
- a new deployment, if chosen, has exactly two successful setup
  transactions;
- the `deployment_state` runtime is generated and consistent across services;
- all three containers are healthy;
- no private key is present in application container environments;
- the frontend, login, dashboard, and public verifier load;
- a synthetic certificate can be issued and verified; and
- no personal certificate data or secret is committed or shared.
