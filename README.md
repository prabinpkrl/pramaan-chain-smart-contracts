# PramaanChain Blockchain

PramaanChain is a Solidity certificate-proof registry. Authorized institutions
anchor SHA-256 document hashes, and anyone can read whether a hash is unknown,
active, or permanently revoked. The contract never receives or stores the
certificate file or citizen information.

The local implementation and demonstration are complete. The independently
reviewed contract is also deployed and source-verified on Sepolia. No
production deployment has occurred.

## Requirements

- Node.js `22.13.0` or newer
- npm (included with Node.js)

No environment variables, wallet secrets, or external RPC service are needed
for the local workflow.

## Clean installation

From this `blockchain/` directory:

```bash
npm ci
npm run compile
npm test
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`.
Compilation uses Solidity `0.8.28`. A successful compile generates the contract
artifact and ABI at:

```text
artifacts/contracts/PramaanChain.sol/PramaanChain.json
```

The ABI is the `abi` property of that JSON file. `artifacts/` is generated and
ignored by Git, so compile before attempting to load it.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Compile the Solidity contract and generate artifacts |
| `npm test` | Run the complete contract test suite |
| `npm run coverage` | Run tests with Solidity coverage reporting |
| `npm run clean` | Remove Hardhat-generated build output |
| `npm run local:node` | Start a persistent local Hardhat JSON-RPC node |
| `npm run local:deploy` | Deploy a fresh contract to the running local node |
| `npm run local:demo` | Run the full checked local certificate lifecycle |
| `npm run sepolia:deploy-demo` | Run the guarded synthetic lifecycle on Sepolia; requires explicit deployment approval |
| `npm run sepolia:verify -- <address>` | Verify a deployed Sepolia address on Etherscan |

## Local deployment

Start the development blockchain in terminal 1:

```bash
npm run local:node
```

Keep it running. In terminal 2, deploy a fresh contract:

```bash
npm run local:deploy
```

The deployment script prints JSON containing the network, chain ID,
administrator, contract address, deployment transaction hash, and deployment
block. For a complete demonstration instead, run:

```bash
npm run local:demo
```

The demonstration deploys a new contract and then:

1. authorizes a sample Hardhat development issuer;
2. creates a SHA-256 hash from synthetic input;
3. issues the hash and verifies it as `ACTIVE`;
4. revokes it through the original issuer; and
5. verifies it as `REVOKED`.

The script fails if the stored issuer or either expected status is incorrect.
The captured Stage 8 run is in
[`docs/STAGE8_DEMONSTRATION.md`](docs/STAGE8_DEMONSTRATION.md).

Hardhat development accounts, addresses, transactions, and contract state are
temporary. Stopping and restarting the local node resets the chain. Never use
the printed development private keys on a public network or fund those
addresses with real assets.

## Sepolia deployment

Sepolia is configured as an HTTP layer-1 network with chain ID `11155111`.
Configuration values are lazy, so local compilation, tests, and demonstrations
do not require Sepolia secrets.

| Item | Public Sepolia testnet value |
| --- | --- |
| Contract address | [`0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84) |
| Chain ID | `11155111` |
| Deployment commit | `73a711d0694197e70e2c262fffd587183c7414fa` |
| Administrator | `0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447` |
| Authorized issuer | `0x4e02876F9bfd58f9D2D542F9520055BeD3addd28` |
| Source verification | [Verified contract on Etherscan](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |

The complete deployment, transaction, block, gas, lifecycle, and bytecode
evidence is recorded in
[`docs/SEPOLIA_DEPLOYMENT.md`](docs/SEPOLIA_DEPLOYMENT.md).

Use two new test-only wallets: account 0 is the administrator/deployer and
account 1 is the sample issuer. Neither may be a personal or mainnet wallet.
The administrator wallet is controlled by the blockchain lead, and private
keys must never be shared, printed, or committed.

The preferred local setup uses Hardhat's encrypted keystore:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ISSUER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Exported environment variables, a gitignored `.env`, and GitHub repository
secrets use the same names. `.env.example` contains placeholders only. The
complete setup, wallet, CI, preflight, and safety requirements are in
[`docs/SEPOLIA_PREPARATION.md`](docs/SEPOLIA_PREPARATION.md).
The local Stage 10 checks are recorded in
[`docs/STAGE10_VALIDATION.md`](docs/STAGE10_VALIDATION.md).
The deployment commands remain available for reproducibility, but must not be
rerun against Sepolia without a new explicitly approved deployment operation.

## Contract roles

| Role | Permissions |
| --- | --- |
| Administrator | Authorize issuers, remove issuers, and revoke any certificate |
| Authorized issuer | Issue new certificate hashes and revoke its own earlier certificates |
| Public verifier | Read certificate records and verification status without a signer |

The deployer receives `ADMIN_ROLE`. It does not automatically receive
`ISSUER_ROLE`. Administrator membership is fixed in this version; inherited
`grantRole`, `revokeRole`, and `renounceRole` calls are deliberately disabled.
Removing an issuer blocks future issuance but does not invalidate its existing
certificates or prevent it from revoking certificates it originally issued.

## Application interface

| Function | Who may call | Result |
| --- | --- | --- |
| `authorizeIssuer(address issuer)` | Administrator | Grants issuer authorization |
| `removeIssuer(address issuer)` | Administrator | Removes future issuance permission |
| `isAuthorizedIssuer(address issuer)` | Anyone | Returns `bool` |
| `issueCertificate(bytes32 documentHash)` | Authorized issuer | Stores a unique active certificate record |
| `getCertificate(bytes32 documentHash)` | Anyone | Returns issuer, timestamps, and status |
| `verifyCertificate(bytes32 documentHash)` | Anyone | Returns the verification status enum |
| `revokeCertificate(bytes32 documentHash)` | Original issuer or administrator | Permanently revokes an issued certificate |

Verification status values are stable ABI integers:

| Value | Name | Meaning |
| ---: | --- | --- |
| `0` | `NOT_FOUND` | The hash has never been issued |
| `1` | `ACTIVE` | The hash was issued and has not been revoked |
| `2` | `REVOKED` | The certificate was permanently revoked |

The complete function, event, error, and state-transition specification is in
[`docs/CONTRACT_DESIGN.md`](docs/CONTRACT_DESIGN.md). Backend configuration,
ABI usage, hashing rules, event fields, transaction expectations, and known
limitations are in
[`docs/BACKEND_HANDOFF.md`](docs/BACKEND_HANDOFF.md).
The clean-install walkthrough result is recorded in
[`docs/STAGE9_VALIDATION.md`](docs/STAGE9_VALIDATION.md).

## Sepolia backend gateway

The `defy` branch includes an Express and ethers.js prototype gateway in
`backend/`. It provides provider-only verification, confirmed certificate
and event queries, and protected issuer write endpoints.

```bash
cd backend
npm ci
cp .env.example .env
# Fill the gitignored file with the public contract/RPC configuration.
# Add issuer credentials only when write operations are intentionally enabled.
npm test
npm start
```

The backend can run safely in read-only mode without an issuer private key or
write API key. Its RPC must support historical `eth_getLogs` queries from
deployment block `11318772`; otherwise direct verification remains available
but certificate lists and event history report a degraded index.

Writes fail closed unless the expected issuer address, test-only issuer key,
and a server-side `WRITE_API_KEY` are configured. Every write also requires a
unique `Idempotency-Key`. The single-process prototype persists these operation
records in a gitignored local journal so a restart cannot silently resubmit an
ambiguous write. The API key is a server-to-server prototype control and must
never be embedded in frontend code. Current API configuration, security rules,
requests, responses, and limitations are documented in
[`docs/BACKEND_API.md`](docs/BACKEND_API.md) and
[`docs/BACKEND_SAMPLES.md`](docs/BACKEND_SAMPLES.md).

The issuer signer's Ethereum transaction nonce and the HTTP
`Idempotency-Key` protect blockchain writes; they do not implement citizen
wallet login. Citizen login nonce challenges, wallet-signature verification,
sessions, and wallet-connected frontend screens remain unimplemented.
`TRUST_PROXY` is disabled for local/direct use and is needed only when Express
is deployed behind a known reverse proxy.

## Document hashing

Hash the exact raw certificate bytes with SHA-256 off-chain. The result must be
32 bytes, represented for EVM calls as `0x` followed by 64 hexadecimal
characters. Pass that digest directly as Solidity `bytes32`.

Do not upload the document to the contract, hash a filename, use a JSON string
unless it is the agreed canonical document representation, or replace SHA-256
with Ethereum's Keccak-256. Every issuer and verifier must hash identical bytes
to obtain the same identifier.

## Privacy and security boundary

Only the document hash, issuer address, issuance timestamp, revocation
timestamp, and status are recorded. State and events must never contain the
certificate contents, citizen identity, contact details, marks, or a detailed
revocation reason. A hash is a fingerprint, not encryption; the original
document remains off-chain and must be protected separately.

The current contract is non-upgradeable, has no external calls, and uses
OpenZeppelin `AccessControl`. Block timestamps are blockchain metadata and must
not be treated as exact wall-clock proof.

## Project structure

```text
contracts/PramaanChain.sol       Smart contract
test/PramaanChain.test.js        Complete automated test suite
backend/src/                     Sepolia backend gateway
backend/test/                    Backend unit and API tests
scripts/deploy.js                Local deployment-only script
scripts/demo.js                  Checked local or Sepolia lifecycle demonstration
docs/CONTRACT_DESIGN.md          Detailed contract specification
docs/BACKEND_HANDOFF.md          Later-integration reference
docs/STAGE8_DEMONSTRATION.md     Captured local execution evidence
docs/STAGE9_VALIDATION.md        Clean-install and handoff validation evidence
docs/SEPOLIA_PREPARATION.md      Stage 10 network and secret preparation
docs/STAGE10_VALIDATION.md       Stage 10 local validation evidence
docs/SEPOLIA_DEPLOYMENT.md       Stage 11 public testnet deployment evidence
hardhat.config.js                Hardhat and Solidity configuration
```

## Deferred work

Sepolia deployment and Etherscan verification are complete. The following
remain deferred:

- Ethereum mainnet or production EVM deployment;
- full citizen/institution backend, database, sessions, and durable queue;
- frontend, QR-code, citizen registration, login, wallet, or delivery features;
- document storage or citizen ownership proof;
- production key management through KMS, HSM, or Vault;
- production monitoring, multisignature control, and administrator recovery;
- proxies, upgradeability, pausing, or batch issuance; and
- zero-knowledge proofs.

These require separate design and explicit authorization.
