# PramaanChain Backend Handoff

## 1. Scope

This document describes the interface that a later backend service will use.
It does not implement that backend and does not define a public testnet or
production deployment.

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

There is no permanent contract address yet. The address in the Stage 8 evidence
belongs to a temporary local chain and is not integration configuration for a
new node session. A later public deployment must supply its own reviewed RPC
URL, chain ID, address, confirmations policy, and signer configuration.

For local integration, start the node, deploy the contract, retain the printed
address for that running node, and initialize the client with the generated
ABI. Recompiling regenerates the ignored `artifacts/` directory.

## 3. Roles and callers

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
eventual target network.

## 4. Certificate data

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

## 5. Application functions

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

## 6. Domain events

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `IssuerAuthorized` | `issuer`, `administrator` | None |
| `IssuerRemoved` | `issuer`, `administrator` | None |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |

OpenZeppelin `RoleGranted` and `RoleRevoked` are also emitted during issuer
changes. Application indexing should use the domain events above as its stable
business interface. Event consumers must tolerate duplicate delivery and
chain reorganization according to the eventual network's confirmation policy.

## 7. Errors

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

## 8. SHA-256 to `bytes32`

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

## 9. Transaction and read workflow

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

## 10. Required backend configuration

A later deployment must supply and validate:

- RPC URL and expected chain ID;
- deployed `PramaanChain` address for that chain;
- ABI generated from the same reviewed contract build;
- administrator signer for issuer management and emergency revocation;
- issuer signer mapping for certificate issuance;
- SHA-256 byte-canonicalization rules;
- receipt confirmation and failure policy; and
- event indexing start block, confirmation depth, and replay/idempotency rules.

Never commit RPC credentials, funded private keys, seed phrases, or production
signer material. Production signers require a separately approved KMS, HSM,
Vault, or equivalent design.

## 11. Privacy and security assumptions

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

## 12. Known limitations and deferred work

The completed component is a local, non-upgradeable proof registry. It does not
include:

- EVM testnet or production deployment and block-explorer verification;
- backend implementation, REST APIs, databases, or transaction queues;
- frontend applications or QR-code generation and scanning;
- citizen registration, authentication, wallet, delivery, or ownership proof;
- certificate/document storage or detailed revocation reasons;
- production KMS, HSM, Vault, monitoring, governance, administrator recovery,
  or multisignature control;
- role enumeration, pausing, proxies, upgrades, or migration tooling;
- batch issuance; or
- zero-knowledge proofs.

Network selection, production signing, administrator governance, QR payloads,
citizen workflows, ownership proof, and any future contract extensions require
separate design approval.
