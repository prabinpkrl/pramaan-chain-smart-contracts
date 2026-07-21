# Sepolia Preparation

## 1. Status and boundary

Stage 10 prepares PramaanChain for Sepolia chain ID `11155111`. It does not
deploy the contract, authorize an issuer, issue or revoke a certificate, verify
source code, create wallets, request faucet funds, or send any public-network
transaction.

Sepolia deployment remains Stage 11 work and requires both an independent
Stage 10 `PASS` review and separate explicit approval.

## 2. Network configuration

`hardhat.config.js` defines `sepolia` with:

```text
type: http
chainType: l1
chainId: 11155111
account 0: DEPLOYER_PRIVATE_KEY
account 1: ISSUER_PRIVATE_KEY
```

Hardhat validates the RPC chain ID, and the deployment scripts independently
refuse a mismatched or unsupported network before deployment. Sepolia
deployment and verification both use the `production` build profile.

Configuration variables are lazy. Commands that use only the local Hardhat
network do not require any Sepolia value.

## 3. Wallet preparation

The blockchain lead must create two unrelated, test-only wallets outside this
repository and outside Codex:

| Position | Purpose | Permissions after demonstration |
| ---: | --- | --- |
| 0 | Administrator and deployer | `ADMIN_ROLE`; can manage issuers and revoke any certificate |
| 1 | Synthetic sample issuer | `ISSUER_ROLE`; can issue and revoke its own certificate |

Requirements:

- Do not use a personal, mainnet, production, or reused project wallet.
- Do not share private keys or seed phrases with any person, chat, issue,
  document, screenshot, or support channel.
- Store only the minimum Sepolia ETH needed for the approved transactions.
- Confirm both public addresses through a separate trusted channel before
  deployment.
- The issuer requires Sepolia ETH because it sends the issuance and revocation
  transactions.
- Never send real ETH or assets to either test wallet.

Stage 11 uses four state-changing transactions: contract deployment and issuer
authorization from the administrator, then issuance and revocation from the
issuer.

## 4. Encrypted keystore workflow

Hardhat's encrypted keystore is the preferred local secret store. Enter each
value only at Hardhat's hidden prompt:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ISSUER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

The keystore is stored outside the repository in the operator's home
directory. Use this command to confirm variable names without exposing values:

```bash
npx hardhat keystore list
```

Do not run `keystore get` in recorded terminals, CI logs, screenshots, or
support sessions because it reveals the stored value.

## 5. Environment fallback and CI

`.env.example` defines the required names with non-secret placeholders:

```dotenv
SEPOLIA_RPC_URL=https://your-sepolia-rpc.example
DEPLOYER_PRIVATE_KEY=0xYOUR_TEST_ONLY_DEPLOYER_PRIVATE_KEY
ISSUER_PRIVATE_KEY=0xYOUR_TEST_ONLY_ISSUER_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
```

A developer who cannot use the encrypted keystore may create an untracked
`.env` with real test-only values. Pinned `dotenv` loading does not override a
value already exported by the shell. `.env`, `.env.*`, logs, dependencies,
artifacts, caches, and coverage output are ignored.

CI/CD must use GitHub repository secrets with the same four names. No automated
Sepolia deployment workflow is approved in Stage 10, and no workflow may print
secret values or upload `.env` or keystore contents as artifacts.

## 6. Commands reserved for Stage 11

The following commands are documented and configured but must not be run in
Stage 10:

```bash
npm run sepolia:deploy-demo
npm run sepolia:verify -- <DEPLOYED_CONTRACT_ADDRESS>
```

`sepolia:deploy-demo` deploys a new contract and performs the complete checked
synthetic lifecycle using the two configured signers. It fails if the chain ID,
signer count, signer separation, receipts, stored issuer, or expected `ACTIVE`
and `REVOKED` statuses are wrong.

The verification command targets Etherscan and uses the same production build
profile as deployment. The contract constructor takes no arguments.

## 7. Stage 11 preflight

Before requesting final transaction approval, Stage 11 must perform read-only
checks for:

- clean working tree and the independently approved candidate revision;
- successful compilation and complete automated tests;
- RPC reachability and chain ID exactly `11155111`;
- expected administrator and issuer public addresses in the configured order;
- sufficient but limited Sepolia ETH balances;
- administrator nonce and absence of an accidental prior deployment assumption;
- expected transaction count and gas estimates; and
- availability of the ABI and matching production build artifacts.

Any mismatch blocks deployment. A change to contract code, dependencies,
Hardhat configuration, or deployment scripts after review requires a new
independent Stage 10 review.

## 8. Evidence and failure handling

The Stage 11 evidence record will contain public testnet identifiers only:
contract and wallet addresses, transaction hashes and blocks, reviewed
revision, compiler/build profile, synthetic hash, status results, and Etherscan
links.

It must never contain a credentialed RPC URL, API key, private key, seed phrase,
keystore content, or real certificate data. If any write fails or its outcome
is ambiguous, stop, preserve confirmed public evidence, diagnose with read-only
calls, and obtain direction before repeating a transaction or redeploying.

## 9. Production boundary

The dedicated Sepolia wallets are not a production custody design. Before a
deployment involving real institutions, certificates, or assets, PramaanChain
requires an external professional audit, an organization-managed
multisignature administrator design, production issuer key management, and a
newly approved deployment architecture.
