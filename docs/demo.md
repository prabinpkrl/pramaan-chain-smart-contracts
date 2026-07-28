# Independent Sepolia Demo

This guide starts from a fresh clone and produces an independently controlled
PramaanChain prototype on Ethereum Sepolia. The teammate or reviewer who
deploys the contract becomes its administrator and does not depend on the
original PramaanChain administrator wallet.

This is a testnet demonstration, not a production deployment.

## What this walkthrough creates

- A new Sepolia `PramaanChain` contract
- A new administrator account controlled by the person running the demo
- A separate authorized issuer account controlled by the same demo operator
  or another teammate
- One synthetic proof issued and permanently revoked by the deployment script
- A local public gateway pointed at the new deployment
- A local SIWE and encrypted-SQLite application backend
- A local React frontend configured for the new contract

The deployment command sends four Sepolia transactions:

1. deploy the contract;
2. authorize the issuer;
3. issue one synthetic document hash; and
4. revoke that synthetic hash.

Do not run it until both test-only wallets are funded and the displayed
addresses have been checked.

## 1. Prerequisites

Install:

- Git
- Node.js `22.13.0` or newer
- npm
- A browser wallet such as MetaMask, Rabby, or Coinbase Wallet

Obtain:

- A Sepolia RPC URL
- An Etherscan API key for source verification
- A WalletConnect/Reown project ID if mobile-wallet QR login is required
- A small amount of Sepolia ETH from a faucet

Sepolia is chain ID `11155111`. Never substitute Ethereum mainnet.

## 2. Create dedicated test wallets

Create two new accounts that are used only for this demo:

| Account | Purpose | Needs Sepolia ETH |
| --- | --- | --- |
| Administrator/deployer | Deploys the contract and controls `ADMIN_ROLE` | Yes |
| Issuer | Receives `ISSUER_ROLE`, issues proofs, and revokes its proofs | Yes |

Record both public addresses. Confirm that they are different.

Do not use a personal wallet, mainnet wallet, seed phrase shared with another
project, or an account holding real assets. A private key must never be sent
through chat, committed, placed in frontend configuration, or left in shell
history.

Fund both public addresses with only the Sepolia ETH needed for the
demonstration. The administrator pays for deployment and authorization. The
issuer pays for issuance and revocation.

## 3. Clone and install

```bash
git clone https://github.com/prabinpkrl/pramaan-chain-smart-contracts.git
cd pramaan-chain-smart-contracts

npm ci
npm --prefix backend ci
npm --prefix app-backend ci
npm --prefix __frontend ci
```

Confirm the supported runtime:

```bash
node --version
npm --version
```

## 4. Required test gate before using Sepolia

```bash
npm run compile
npm test

npm --prefix backend test
npm --prefix app-backend test
npm --prefix __frontend run lint
npm --prefix __frontend test
npm --prefix __frontend run build
```

Every command above must pass before deployment. Do not hide, skip, weaken, or
delete a failing test to continue. Fix the failure and rerun the complete gate.

Compilation creates:

```text
artifacts/contracts/PramaanChain.sol/PramaanChain.json
```

The production-profile deployment and source verification must use the same
source and compiler configuration.

## 5. Configure deployment secrets

### Recommended: Hardhat encrypted keystore

Enter each value at the interactive prompt:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ISSUER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Use the administrator/deployer private key for `DEPLOYER_PRIVATE_KEY` and the
separate issuer private key for `ISSUER_PRIVATE_KEY`. The keys should include
the `0x` prefix.

Hardhat stores these values in its encrypted keystore. The commands do not
require putting a private key in a tracked file or command argument.

Check only the stored variable names:

```bash
npx hardhat keystore list
```

Do not run a command that prints a stored private key.

### Optional fallback: gitignored `.env`

Use this only when the encrypted keystore is unavailable:

```bash
cp .env.example .env
```

Replace the four deployment placeholders in `.env`:

```dotenv
SEPOLIA_RPC_URL=https://your-private-sepolia-rpc.example
DEPLOYER_PRIVATE_KEY=0xYOUR_TEST_ONLY_ADMINISTRATOR_PRIVATE_KEY
ISSUER_PRIVATE_KEY=0xYOUR_TEST_ONLY_ISSUER_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

The repository ignores `.env`, but plaintext keys are still less safe than the
encrypted keystore. Never commit the file, attach it to an issue, or share it.

## 6. Pre-deployment checklist

Before continuing, confirm:

- the RPC reports Sepolia chain ID `11155111`;
- the administrator and issuer are different accounts;
- both accounts are test-only;
- both accounts have enough Sepolia ETH;
- contract compilation and tests pass;
- no real certificate or personal information will be used; and
- the current Git commit is the source you intend to deploy.

The deployment script rejects an unsupported network, a chain-ID mismatch,
missing signers, and identical administrator and issuer addresses.

## 7. Deploy on-chain and run the checked lifecycle

This is the state-changing step:

```bash
npm run sepolia:deploy-demo
```

Wait for the command to finish. Do not interrupt it after a transaction has
been submitted. If a transaction becomes ambiguous, inspect its hash and
current contract state before running anything again.

Successful output includes:

```json
{
  "network": "sepolia",
  "chainId": "11155111",
  "administrator": "0x...",
  "issuer": "0x...",
  "contractAddress": "0x...",
  "deploymentBlockNumber": 12345678,
  "transactions": {
    "deployment": "0x...",
    "issuerAuthorization": "0x...",
    "certificateIssuance": "0x...",
    "certificateRevocation": "0x..."
  },
  "statusAfterIssuance": "ACTIVE",
  "statusAfterRevocation": "REVOKED"
}
```

Record these public values:

- `contractAddress`
- `deploymentBlockNumber`
- `administrator`
- `issuer`
- all four transaction hashes

The sample hash is synthetic and ends in `REVOKED`. The contract remains ready
for new application-issued proofs.

This output is the first on-chain checkpoint. Confirm:

- `network` is `sepolia`;
- `chainId` is `11155111`;
- `administrator` matches the dedicated deployer account;
- `issuer` matches the separate issuer account;
- `deploymentBlockNumber` is present;
- all four transaction hashes have successful Sepolia receipts;
- `statusAfterIssuance` is `ACTIVE`; and
- `statusAfterRevocation` is `REVOKED`.

If any checkpoint fails or is ambiguous, stop. Do not automatically deploy
again.

## 8. Verify the contract source

Use the newly reported address:

```bash
npm run sepolia:verify -- <NEW_CONTRACT_ADDRESS>
```

Open the deployment on:

```text
https://sepolia.etherscan.io/address/<NEW_CONTRACT_ADDRESS>#code
```

Confirm that Etherscan shows verified source and that the address exactly
matches the deployment output.

## 9. Configure the public gateway

Create its ignored environment file:

```bash
cp backend/.env.example backend/.env
```

Set:

```dotenv
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=<NEW_CONTRACT_ADDRESS>
PRAMAAN_CHAIN_START_BLOCK=<NEW_DEPLOYMENT_BLOCK_NUMBER>
SEPOLIA_RPC_URL=<YOUR_SEPOLIA_RPC_URL>
CORS_ALLOWED_ORIGINS=http://localhost:5173
TRUST_PROXY=false
PORT=3000
```

Keep the optional server-side gateway write service disabled:

```dotenv
ISSUER_ADDRESS=
ISSUER_PRIVATE_KEY=
WRITE_API_KEY=
```

The React application signs administrator, issuer, and revocation transactions
in the selected wallet. It does not use the gateway's optional server-side
signer.

The RPC provider must support historical `eth_getLogs` beginning at the new
deployment block. Direct verification can work while event indexing is
degraded, but document and event lists require historical log access.

## 10. Configure the private application backend

Create its ignored environment file:

```bash
cp app-backend/.env.example app-backend/.env
```

Generate a new 32-byte base64 encryption key:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Store the generated value immediately in `app-backend/.env`. It encrypts
private local application fields and is not a wallet key.

Configure:

```dotenv
PORT=4000
APP_ORIGIN=http://localhost:5173
SIWE_DOMAIN=localhost:5173
DATABASE_PATH=.data/pramaan-app.sqlite
APP_DATA_ENCRYPTION_KEY=<NEW_32_BYTE_BASE64_VALUE>
SEPOLIA_RPC_URL=<YOUR_SEPOLIA_RPC_URL>
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=<NEW_CONTRACT_ADDRESS>
COOKIE_SECURE=false
```

Use the same RPC and contract address as the gateway. A different address
causes role derivation and transaction confirmation to disagree.

## 11. Configure the frontend

Create its ignored environment file:

```bash
cp __frontend/.env.example __frontend/.env
```

Configure:

```dotenv
VITE_APP_API_URL=http://localhost:4000/api
VITE_BLOCKCHAIN_API_URL=http://localhost:3000/api
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=<NEW_CONTRACT_ADDRESS>
VITE_ETHERSCAN_BASE_URL=https://sepolia.etherscan.io
VITE_PUBLIC_APP_URL=http://localhost:5173
VITE_WALLETCONNECT_PROJECT_ID=<YOUR_PUBLIC_REOWN_PROJECT_ID>
```

`VITE_WALLETCONNECT_PROJECT_ID` may be blank when only browser extensions are
used. It must be configured to open the mobile-wallet QR modal.

All `VITE_*` values are public. Never place an RPC credential, private key,
seed phrase, application encryption key, or gateway API key in this file.

Restart Vite whenever a frontend environment value changes.

## 12. Required test gate after configuration

```bash
npm --prefix backend test
npm --prefix app-backend test
npm --prefix __frontend run lint
npm --prefix __frontend test
npm --prefix __frontend run build
```

These tests do not send another Sepolia write.

All commands must pass with the newly prepared local configuration before the
application walkthrough. The frontend E2E suite can also be run with:

```bash
npm --prefix __frontend run test:e2e
```

The deterministic E2E suite uses mocked wallet and service boundaries and does
not send a Sepolia transaction.

## 13. Start the application

Open three terminals in the repository root.

Terminal 1:

```bash
npm --prefix backend start
```

Terminal 2:

```bash
npm --prefix app-backend start
```

Terminal 3:

```bash
npm --prefix __frontend run dev
```

Check:

```bash
curl http://localhost:3000/api/health
curl http://localhost:4000/api/health
```

Then open <http://localhost:5173>.

Both backends fail closed when the RPC chain ID is wrong, the contract address
has no deployed bytecode, or mandatory configuration is missing.

## 14. Import the demo accounts into a wallet

Import the dedicated administrator and issuer accounts into your browser or
mobile wallet using that wallet's local account-import flow. Do not put either
private key in frontend configuration.

Enable Sepolia in the wallet. Verify the public address shown by the wallet
before every signature or transaction:

- administrator must equal the deployment output's `administrator`;
- issuer must equal the deployment output's `issuer`; and
- the selected network must be Sepolia.

The wallet may display the same accounts on other EVM networks. Their Sepolia
balance and transaction history are separate from mainnet.

## 15. Run the application demonstration

### Administrator

1. Open `/login`.
2. Select the administrator wallet and sign the SIWE message.
3. Open **Institutions and issuers**.
4. Create an institution with a permanent public ID such as `DEMO-UNIVERSITY`.
5. Enter the issuer address reported by the deployment script.

The deployment script already authorized that issuer. The application checks
the current role and registers the institution without resending the
authorization transaction.

### Citizen

Use a separate test wallet. It does not need Sepolia ETH:

1. Sign in with SIWE.
2. Connect to `DEMO-UNIVERSITY`.
3. Submit a certificate request.

The citizen relationship and request remain private in the local encrypted
SQLite database.

### Issuer

1. Change the wallet account to the authorized issuer.
2. Sign in again.
3. Open the pending request.
4. Select a synthetic certificate file.
5. Confirm its local SHA-256 digest.
6. Sign the Sepolia issuance transaction.
7. Wait until the backend independently confirms the receipt and `ACTIVE`
   contract status.

Only the digest is sent to Ethereum. Do not use a real certificate or personal
data in this testnet demonstration.

### Public verifier

Open the public verifier without signing in:

1. Paste the issued `0x`-prefixed SHA-256 digest, or select the exact same file.
2. Run verification.
3. Confirm the result is `ACTIVE` and the issuer matches the new issuer
   address.

Changing one file byte creates another hash and normally returns `NOT_FOUND`.

## 16. Common problems

### `Chain ID mismatch`

The RPC is not connected to Sepolia. Use an RPC endpoint that reports
`11155111`.

### `No bytecode at ...`

One component contains the wrong contract address, or the RPC points to
another chain. Copy the address exactly from the deployment output.

### Event index is degraded

Confirm `PRAMAAN_CHAIN_START_BLOCK` matches the new deployment block and that
the RPC supports historical `eth_getLogs`.

### Login succeeds with the wrong role

Confirm the selected wallet address. Administrator role comes from the new
contract. Issuer role requires both on-chain authorization and the local
institution registration.

### SIWE domain or CORS error

For the npm development setup, use `http://localhost:5173` consistently in
`APP_ORIGIN`, `SIWE_DOMAIN`, `CORS_ALLOWED_ORIGINS`, and the browser URL.
Do not mix `localhost` with `127.0.0.1`.

### Mobile QR does not open

Set `VITE_WALLETCONNECT_PROJECT_ID`, restart the frontend, and reload the login
page.

### Transaction submitted but the command stopped

Do not immediately rerun the deployment. Inspect the reported transaction
hashes, account nonce, Etherscan receipts, and current contract state first. A
retry may create another independent contract or duplicate an intended write.

## 17. Stop and preserve the demo

Stop each npm process with `Ctrl+C`.

The local SQLite database is under `app-backend/.data/` and is ignored by Git.
Deleting it removes local relationships and sessions but does not change
Sepolia.

Sepolia contracts and transactions are public and permanent. Record the
contract address, deployment block, wallet public addresses, commit SHA, and
Etherscan links. Never record private keys, seed phrases, RPC credentials, or
the application encryption key.
