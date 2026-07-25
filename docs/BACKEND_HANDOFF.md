# PramaanChain Backend Handoff

## 1. Scope

This document gives the backend developer the information and requirements
needed to implement read and write integration with `PramaanChain`. It does
not prescribe the backend's web framework, database, authentication system, or
route names. The contract is deployed and verified on Sepolia for public
staging. No production network or production deployment is defined.

The contract accepts only SHA-256 document hashes and stores non-sensitive
blockchain metadata. Original documents and all personal information remain
off-chain.

## 2. Contract and connection artifacts

| Item | Local development value or source |
| --- | --- |
| Contract name | `PramaanChain` |
| Solidity source | `contracts/PramaanChain.sol` |
| RPC URL | `http://127.0.0.1:8545` while `npm run local:node` is running |
| Chain ID | `31337` |
| Contract address | Read `contractAddress` from each `npm run local:deploy` or `npm run local:demo` result |
| Full artifact | `artifacts/contracts/PramaanChain.sol/PramaanChain.json` |
| ABI | The artifact's `abi` property |

Deployed Sepolia connection metadata:

| Item | Public Sepolia testnet value |
| --- | --- |
| Network | `sepolia` |
| Chain ID | `11155111` |
| RPC configuration | `SEPOLIA_RPC_URL` secret; no credentialed URL is committed |
| Contract address | `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` |
| Deployment commit | `73a711d0694197e70e2c262fffd587183c7414fa` |
| Administrator/deployer | `0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447` |
| Authorized issuer | `0x4e02876F9bfd58f9D2D542F9520055BeD3addd28` |
| Source verification | [Verified contract on Etherscan](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |

Transaction hashes, block numbers, lifecycle results, gas use, and bytecode
comparison evidence are recorded in
[`SEPOLIA_DEPLOYMENT.md`](SEPOLIA_DEPLOYMENT.md).

The Sepolia address is persistent public testnet integration configuration.
The address in the Stage 8 evidence belongs to a temporary local chain and is
not integration configuration for a new node session. A future production
deployment must supply its own reviewed RPC URL, chain ID, address,
confirmation policy, and signer configuration.

For local integration, start the node, deploy the contract, retain the printed
address for that running node, and initialize the client with the generated
ABI. Recompiling regenerates the ignored `artifacts/` directory.

Generate the ABI from the reviewed production build with:

```bash
npx hardhat compile --build-profile production
```

The generated artifact is located at:

```text
artifacts/contracts/PramaanChain.sol/PramaanChain.json
```

Use the artifact's `abi` property. The `artifacts/` directory is generated and
ignored by Git, so the backend build or release process must compile the
reviewed commit or securely package that ABI rather than expecting it in the
repository.

## 3. Integration responsibilities and required exchange

### Blockchain side provides to the backend team

- Sepolia chain ID, deployed contract address, deployment block, reviewed
  commit, and Etherscan verification link from Section 2.
- The ABI generated from the exact reviewed deployment commit.
- The function, status, role, event, and custom-error definitions in this
  document.
- The SHA-256 input rule: hash the exact raw document bytes and pass only the
  resulting `bytes32` digest on-chain.
- Read-only assistance to confirm the deployed bytecode, issuer authorization,
  transaction receipts, events, and certificate state.
- A separate administrator operation to authorize or remove an approved
  backend issuer public address.

The blockchain side does **not** provide the administrator private key,
existing issuer private key, seed phrase, `.env`, credentialed RPC URL,
Etherscan API key, or keystore contents. The current public issuer address in
Section 2 is deployment evidence; it does not authorize transferring that
wallet's secret to the backend team.

### Backend team provides to the blockchain side

- The backend runtime and Ethereum client library, including pinned versions.
- A new dedicated Sepolia issuer **public address** if the backend will submit
  writes. Its secret must be generated and stored by the backend operator and
  must never be sent to the blockchain lead.
- Confirmation that the issuer wallet is test-only, is not reused on mainnet,
  and contains only limited faucet Sepolia ETH.
- Its RPC provider arrangement and proof that chain ID `11155111` is checked
  at startup.
- Its server-side secret-management approach. Browser bundles, mobile apps,
  logs, API responses, source control, and client-visible environment
  variables must never contain signer keys.
- Its authenticated authorization mapping showing which institution is
  permitted to use which issuer signer.
- Its receipt-confirmation, nonce, fee, retry, timeout, idempotency, and chain-
  reorganization policies.
- Its event-indexing start block and storage model for transaction hashes,
  blocks, issuer addresses, statuses, and processing state.
- A synthetic integration-test result covering issuance, `ACTIVE`
  verification, revocation, and `REVOKED` verification.

The backend team sends only its issuer public address when requesting
authorization. The blockchain administrator validates that exact address,
submits `authorizeIssuer`, and returns the public transaction evidence. No
private key changes hands.

### Ownership boundary

| Responsibility | Owner |
| --- | --- |
| Contract, ABI, Sepolia address, and on-chain rules | Blockchain side |
| Administrator wallet and issuer authorization/removal | Blockchain lead through a separate controlled process |
| Backend authentication, APIs, database, and document handling | Backend team |
| Backend issuer wallet and secret storage | Backend operator |
| RPC availability, confirmations, retries, nonces, and event processing | Backend team |
| Frontend, QR code, citizen workflow, and certificate delivery | Responsible non-blockchain team |

## 4. Backend startup and client wiring

### Required environment configuration

Equivalent configuration names may be used in the backend, but the following
values and secret boundaries must be preserved:

```dotenv
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
PRAMAAN_CHAIN_START_BLOCK=11318772
SEPOLIA_RPC_URL=secret-managed-value
ISSUER_ADDRESS=expected-public-issuer-address
ISSUER_PRIVATE_KEY=secret-managed-value-for-write-service-only
WRITE_API_KEY=long-random-server-to-server-value
BLOCKCHAIN_CONFIRMATIONS=team-approved-value
```

`ISSUER_PRIVATE_KEY` is required only in the isolated write service. Read-only
verification requires only an RPC provider, chain ID, contract address, and
ABI. Do not configure an administrator private key in the normal backend.

### Startup checks

Before accepting blockchain traffic, the backend must fail closed unless all
of these checks pass:

1. The RPC is reachable and reports chain ID `11155111`.
2. `PRAMAAN_CHAIN_ADDRESS` is a valid address and has nonempty deployed
   bytecode.
3. The loaded ABI exposes the expected read and write functions.
4. A configured write signer derives to the expected backend issuer public
   address.
5. `isAuthorizedIssuer(issuerAddress)` returns `true` before issuance is
   enabled.
6. The issuer has enough Sepolia ETH for the approved transaction, without
   holding unnecessary test funds.

### Minimal ethers v6 wiring example

This example assumes the backend has received the reviewed ABI as `abi`:

```js
import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";

const expectedChainId = 11155111n;
const contractAddress = getAddress(process.env.PRAMAAN_CHAIN_ADDRESS);
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) {
  throw new Error(`Expected Sepolia chain ${expectedChainId}`);
}

const code = await provider.getCode(contractAddress);
if (code === "0x") {
  throw new Error("PramaanChain bytecode is missing at the configured address");
}

const readContract = new Contract(contractAddress, abi, provider);

// Create these only inside the isolated write service.
const issuerSigner = new Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
const writeContract = readContract.connect(issuerSigner);

if (!(await readContract.isAuthorizedIssuer(issuerSigner.address))) {
  throw new Error("Configured backend signer is not an authorized issuer");
}
```

Do not return `issuerSigner`, its private key, signed raw transactions, or
provider credentials from an API. Redact provider errors before logging them.

### Read and write service boundary

| Operation | Connection | Gas | Backend access rule |
| --- | --- | --- | --- |
| `verifyCertificate` | Provider only | None | Public or rate-limited verification |
| `getCertificate` | Provider only | None | Public or rate-limited lookup |
| `isAuthorizedIssuer` | Provider only | None | Internal health/readiness check or public lookup |
| `issueCertificate` | Authorized issuer signer | Sepolia ETH | Authenticated institution mapped to that signer |
| `revokeCertificate` | Original issuer signer | Sepolia ETH | Authenticated original institution and approved revocation workflow |
| `authorizeIssuer` / `removeIssuer` | Administrator signer | Sepolia ETH | Separate blockchain-lead operation; not a normal backend endpoint |

The administrator's emergency revocation path must also remain outside the
routine issuer-facing API.

## 5. Roles and callers

| Role | Identifier | Behavior |
| --- | --- | --- |
| `ADMIN_ROLE` | `0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775` | Authorize/remove issuers and revoke any certificate |
| `ISSUER_ROLE` | `0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122` | Issue certificate hashes |

The identifiers are `keccak256("ADMIN_ROLE")` and
`keccak256("ISSUER_ROLE")`. They can also be read from the public contract
constants rather than hard-coded.

The constructor grants `ADMIN_ROLE` to the deploying address. It grants no
`DEFAULT_ADMIN_ROLE` and does not make the administrator an issuer. The fixed
administrator can explicitly authorize itself if it must issue. Direct calls
to inherited `grantRole`, `revokeRole`, and `renounceRole` always revert; the
backend must use `authorizeIssuer` and `removeIssuer`.

A read-only provider is sufficient for lookup and verification. Administrative
and issuer writes require the appropriate signer and transaction fees on the
selected network.

## 6. Certificate data

```solidity
enum CertificateStatus {
    NOT_FOUND, // 0
    ACTIVE,    // 1
    REVOKED    // 2
}

struct Certificate {
    address issuer;
    uint64 issuedAt;
    uint64 revokedAt;
    CertificateStatus status;
}
```

Unknown hashes return the default record: zero address, zero timestamps, and
status `NOT_FOUND`. An active record has a zero `revokedAt`. A revoked record
retains its original issuer and issuance time and has a nonzero `revokedAt`.
Solidity timestamps are seconds since the Unix epoch, but block producers have
limited timestamp discretion; do not use them as exact civil-time evidence.

## 7. Application functions

### `authorizeIssuer(address issuer)`

- Transaction caller: an account with `ADMIN_ROLE`.
- Returns: nothing; wait for a successful receipt.
- Rejects the zero address and an already-authorized address.
- Emits `IssuerAuthorized` and OpenZeppelin `RoleGranted`.

### `removeIssuer(address issuer)`

- Transaction caller: an account with `ADMIN_ROLE`.
- Returns: nothing; wait for a successful receipt.
- Rejects the zero address and an address that is not authorized.
- Emits `IssuerRemoved` and OpenZeppelin `RoleRevoked`.
- Does not alter earlier certificates. A removed original issuer may still
  revoke certificates it issued before removal.

### `isAuthorizedIssuer(address issuer) returns (bool)`

- Read call available to any provider or account.
- Returns current issuer-role membership; the zero address returns `false`.

### `issueCertificate(bytes32 documentHash)`

- Transaction caller: an account with `ISSUER_ROLE`.
- Returns: nothing; wait for a successful receipt.
- Rejects a zero hash and every previously issued hash, including a revoked
  hash.
- Emits `CertificateIssued` and creates an `ACTIVE` record.

### `getCertificate(bytes32 documentHash) returns (Certificate)`

- Read call available to any provider or account.
- Returns `(issuer, issuedAt, revokedAt, status)`.
- Returns the default `NOT_FOUND` record rather than reverting for an unknown
  or zero hash.

### `verifyCertificate(bytes32 documentHash) returns (CertificateStatus)`

- Read call available to any provider or account.
- Returns ABI integer `0`, `1`, or `2` for `NOT_FOUND`, `ACTIVE`, or `REVOKED`.
- Returns `NOT_FOUND` rather than reverting for an unknown or zero hash.

### `revokeCertificate(bytes32 documentHash)`

- Transaction caller: the record's original issuer or an administrator.
- Current issuer-role membership is not required for the original issuer.
- Rejects unknown hashes, already-revoked hashes, and unrelated callers.
- Emits `CertificateRevoked` and permanently changes `ACTIVE` to `REVOKED`.

## 8. Domain events

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `IssuerAuthorized` | `issuer`, `administrator` | None |
| `IssuerRemoved` | `issuer`, `administrator` | None |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |

OpenZeppelin `RoleGranted` and `RoleRevoked` are also emitted during issuer
changes. Application indexing should use the domain events above as its stable
business interface. Event consumers must tolerate duplicate delivery and
chain reorganization according to the selected network's confirmation policy.

## 9. Errors

| Error | Parameters | Meaning |
| --- | --- | --- |
| `InvalidIssuerAddress` | None | Issuer address is zero |
| `IssuerAlreadyAuthorized` | `address issuer` | Issuer already has authorization |
| `IssuerNotAuthorized` | `address issuer` | Issuer cannot be removed because it lacks authorization |
| `InvalidDocumentHash` | None | Issuance hash is `bytes32(0)` |
| `CertificateAlreadyExists` | `bytes32 documentHash` | Hash was already issued and is permanently reserved |
| `CertificateNotFound` | `bytes32 documentHash` | Revocation target does not exist |
| `CertificateAlreadyRevoked` | `bytes32 documentHash` | Certificate is already revoked |
| `UnauthorizedRevoker` | `address account, bytes32 documentHash` | Caller is neither original issuer nor administrator |
| `DirectRoleManagementDisabled` | None | A disabled inherited role mutation was called |

OpenZeppelin `AccessControlUnauthorizedAccount(address account, bytes32
neededRole)` reports missing administrator or issuer permission. Decode errors
through the generated ABI and present domain-appropriate messages; do not rely
on fragile RPC error strings.

## 10. SHA-256 to `bytes32`

Hash the exact raw document bytes off-chain with SHA-256. SHA-256 already
produces 32 bytes, so the digest maps directly to Solidity `bytes32`; it must
not be padded, truncated, converted to a decimal number, or hashed again.

Example with ethers in Node.js:

```js
import { readFile } from "node:fs/promises";
import { sha256 } from "ethers";

const documentBytes = await readFile("certificate.pdf");
const documentHash = sha256(documentBytes); // 0x plus 64 hex characters
```

The backend can validate the representation before sending it:

```js
import { dataLength, isHexString } from "ethers";

if (!isHexString(documentHash) || dataLength(documentHash) !== 32) {
  throw new Error("documentHash must be a 32-byte hexadecimal SHA-256 digest");
}
```

Hashing must be deterministic across issuance and verification. Hash file
bytes, not a local path, filename, multipart wrapper, base64 text, or JSON
serialization unless that exact representation is the agreed canonical input.
Do not use `ethers.id`, `keccak256`, or Solidity hashing as a substitute for
SHA-256. The document itself is never a contract argument or event value.

## 11. Transaction and read workflow

1. Check `isAuthorizedIssuer` before offering issuance, while still handling a
   transaction-time role failure.
2. Compute and validate the SHA-256 digest off-chain.
3. Optionally call `verifyCertificate` first for user feedback; the contract's
   write-time uniqueness check remains authoritative.
4. Submit `issueCertificate` through the authorized issuer signer.
5. Wait for a successful transaction receipt before treating issuance as
   confirmed, then persist the transaction hash and emitted event off-chain if
   required.
6. Verify with provider-only `verifyCertificate`; use `getCertificate` when the
   issuer and timestamps are also required.
7. For revocation, wait for a successful receipt and confirm `REVOKED`.

The eventual public-network confirmation depth, retry strategy, nonce
management, fee policy, and reorganization handling remain deployment-specific
decisions. Do not mark a write successful merely because a transaction hash
was returned.

### Provider-only read example

```js
const STATUS_NAMES = ["NOT_FOUND", "ACTIVE", "REVOKED"];

export async function verifyDocumentHash(documentHash) {
  const statusValue = Number(
    await readContract.verifyCertificate(documentHash),
  );

  if (STATUS_NAMES[statusValue] === undefined) {
    throw new Error(`Unexpected certificate status: ${statusValue}`);
  }

  const record = await readContract.getCertificate(documentHash);

  return {
    documentHash,
    status: STATUS_NAMES[statusValue],
    issuer: record.issuer,
    issuedAt: record.issuedAt.toString(),
    revokedAt: record.revokedAt.toString(),
  };
}
```

This operation requires no signer and spends no ETH. An unknown hash returns
the zero-address, zero-timestamp record with `NOT_FOUND`; it is not an RPC
failure.

### Receipt-checked write example

```js
async function waitForSuccessfulReceipt(transactionPromise) {
  const transaction = await transactionPromise;
  const confirmations = Number(process.env.BLOCKCHAIN_CONFIRMATIONS);
  const receipt = await transaction.wait(confirmations);

  if (receipt === null || receipt.status !== 1) {
    throw new Error(`Blockchain transaction failed: ${transaction.hash}`);
  }

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
}

export async function issueDocumentHash(documentHash) {
  const receipt = await waitForSuccessfulReceipt(
    writeContract.issueCertificate(documentHash),
  );
  const status = await readContract.verifyCertificate(documentHash);

  if (status !== 1n) {
    throw new Error("Issued certificate did not resolve to ACTIVE");
  }

  return receipt;
}

export async function revokeDocumentHash(documentHash) {
  const record = await readContract.getCertificate(documentHash);
  const signerAddress = await issuerSigner.getAddress();

  if (record.issuer.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error("Configured signer is not the original certificate issuer");
  }

  const receipt = await waitForSuccessfulReceipt(
    writeContract.revokeCertificate(documentHash),
  );
  const status = await readContract.verifyCertificate(documentHash);

  if (status !== 2n) {
    throw new Error("Revoked certificate did not resolve to REVOKED");
  }

  return receipt;
}
```

The backend must serialize transactions sent by the same signer or use a
nonce manager designed for its deployment topology. When submission is
ambiguous, query the transaction hash, pending/latest nonce, events, and
contract state before deciding whether any retry is safe.

### Event processing

- Begin Sepolia indexing at deployment block `11318772`.
- Index `IssuerAuthorized`, `IssuerRemoved`, `CertificateIssued`, and
  `CertificateRevoked` as the stable domain events.
- Store transaction hash, block number, block hash, log index, event name, and
  decoded public fields for idempotency.
- Use `(transactionHash, logIndex)` or an equivalent stable key to prevent
  duplicate processing.
- Process historical ranges in bounded chunks supported by the RPC provider.
- Keep events unfinalized until the team's configured confirmation depth and
  define how records are rolled back after a chain reorganization.

## 12. Required backend configuration

For Sepolia staging, the backend must use and validate:

- an approved Sepolia RPC URL and expected chain ID `11155111`;
- deployed `PramaanChain` address
  `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`;
- ABI generated from deployment commit
  `73a711d0694197e70e2c262fffd587183c7414fa`;
- deployment start block `11318772` for event indexing;
- the backend's expected issuer public address and an isolated issuer signer
  only when the service performs writes;
- a separate administrator-operation process without placing the
  administrator key in the routine backend;
- SHA-256 byte-canonicalization rules;
- receipt confirmation and failure policy; and
- event indexing start block, confirmation depth, and replay/idempotency rules.

Never commit RPC credentials, funded private keys, seed phrases, or production
signer material. Production signers require a separately approved KMS, HSM,
Vault, or equivalent design.

## 13. Privacy and security assumptions

- On-chain state, transaction input, and events are public on a public EVM
  network.
- A document digest is a stable fingerprint, not encryption or access control.
- The backend must reject attempts to place personal information, document
  contents, or detailed revocation reasons into any transaction-associated
  metadata.
- Original documents and citizen data remain off-chain under the backend's own
  authorization, retention, encryption, and deletion policies.
- Hash uniqueness is global within one deployed contract.
- Certificate records cannot be edited, reissued, reactivated, or deleted.
- The contract makes no external calls and receives no native token by design.
- Administrator compromise can authorize issuers and revoke any certificate;
  production governance and key recovery are not defined in this version.
- Issuer-key compromise permits issuance while authorized and revocation of
  certificates originally issued by that address.

## 14. Known limitations and deferred work

The completed blockchain component is a local and Sepolia-deployed,
non-upgradeable proof registry. The `defy` branch also contains a protected
prototype blockchain gateway. It intentionally does not contain:

- Ethereum mainnet or production deployment;
- citizen/institution accounts, database-backed relationships, sessions, or
  a durable shared transaction queue;
- frontend applications or QR-code generation and scanning;
- citizen registration, authentication, wallet, delivery, or ownership proof;
- certificate/document storage or detailed revocation reasons;
- production KMS, HSM, Vault, monitoring, governance, administrator recovery,
  or multisignature control;
- role enumeration, pausing, proxies, upgrades, or migration tooling;
- batch issuance; or
- zero-knowledge proofs.

Production network selection, production signing, administrator governance,
QR payloads, citizen workflows, ownership proof, and any future contract
extensions require separate design approval.

The prototype gateway's ethers `NonceManager` handles only Ethereum
transaction ordering for the configured issuer signer. Its persistent
single-process `Idempotency-Key` journal prevents accidental repeated
issue/revoke submissions. Neither feature implements citizen authentication.
Citizen login still requires separate nonce-challenge generation, wallet
signature verification, session handling, and frontend wallet integration.

`TRUST_PROXY` is optional deployment configuration, not a frontend
requirement. Keep it `false` for direct/local use and configure an exact trusted
proxy-hop count only when the backend is actually behind a known reverse
proxy.

## 15. Integration acceptance checklist

The blockchain/backend integration is ready for the fellowship Sepolia
prototype only when all applicable items are demonstrated:

- [ ] The backend uses chain ID `11155111`, contract address
  `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`, and ABI from reviewed commit
  `73a711d0694197e70e2c262fffd587183c7414fa`.
- [ ] Startup rejects a wrong chain ID, missing bytecode, malformed address,
  missing ABI, and unauthorized issuer signer.
- [ ] The backend issuer wallet is dedicated to Sepolia, securely stored,
  funded only with limited faucet ETH, and authorized through a recorded
  administrator transaction.
- [ ] A provider-only request maps unknown, active, and revoked hashes to
  `NOT_FOUND`, `ACTIVE`, and `REVOKED` without requiring a wallet.
- [ ] The same exact synthetic file bytes produce the same SHA-256 `bytes32`
  value in issuance and verification paths.
- [ ] A new synthetic hash is issued by the intended backend issuer, its
  successful receipt is recorded, and a read returns `ACTIVE` with the correct
  issuer.
- [ ] The same synthetic hash is revoked by its original issuer, its successful
  receipt is recorded, and a read returns `REVOKED`.
- [ ] Duplicate issuance, zero hash, unauthorized issuance, unauthorized
  revocation, missing revocation, and repeated revocation produce safe mapped
  errors.
- [ ] The backend does not report write success before a successful receipt
  and does not automatically duplicate ambiguous writes.
- [ ] Event processing starts at block `11318772`, is idempotent, and has a
  documented confirmation and reorganization policy.
- [ ] No certificate file, personal information, detailed revocation reason,
  private key, seed phrase, RPC credential, or API key appears in calldata,
  logs, source control, test fixtures, screenshots, or API responses.
- [ ] Administrator functions and emergency revocation are not exposed as
  routine public or institution-facing backend endpoints.
- [ ] The backend team gives the blockchain lead its integration-test evidence
  and only the public issuer address required for authorization.

Passing this checklist validates the Sepolia prototype integration. It is not
approval for Ethereum mainnet, production institutions, or real certificate
operations.
