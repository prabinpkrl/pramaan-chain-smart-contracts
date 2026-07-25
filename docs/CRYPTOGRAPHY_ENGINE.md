# PramaanChain Cryptography Engine Documentation

## 1. Introduction

The PramaanChain Cryptography Engine is the off-chain service responsible for document hashing, certificate issuance, certificate verification, and blockchain interaction with the PramaanChain smart contract on Ethereum Sepolia. It acts as the bridge between issuer/verifier applications and the on-chain certificate registry.

The engine never stores or transmits raw certificate data or citizen identity. Only SHA-256 document hashes are anchored to the blockchain.

## 2. Architecture

```
Issuer Portal / Verifier App
            |
        API Gateway
            |
    +-----------------------------+
    | Cryptography Engine         |
    |                             |
    |  +-----------------------+  |
    |  | SHA-256 Hashing       |  |
    |  +-----------------------+  |
    |  | Hash Validation       |  |
    |  +-----------------------+  |
    |  | Issuance Service      |  |
    |  +-----------------------+  |
    |  | Verification Service  |  |
    |  +-----------------------+  |
    |  | Revocation Service    |  |
    |  +-----------------------+  |
    |  | Blockchain Adapter    |  |
    |  | (ethers v6)           |  |
    |  +-----------------------+  |
    +-----------------------------+
            |
      Ethereum Sepolia (Chain ID 11155111)
            |
  PramaanChain Smart Contract
  0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
```

### 2.1 Component Responsibilities

| Component | Responsibility |
|---|---|
| SHA-256 Hashing | Compute deterministic hashes from raw certificate bytes |
| Hash Validation | Ensure hashes are valid 32-byte `0x`-prefixed hex strings |
| Issuance Service | Submit `issueCertificate()` transactions and confirm receipts |
| Verification Service | Query `verifyCertificate()` and `getCertificate()` on-chain |
| Revocation Service | Submit `revokeCertificate()` transactions and confirm receipts |
| Blockchain Adapter | Manage ethers v6 provider, signer, and transaction lifecycle |

## 3. Configuration

### 3.1 Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `SEPOLIA_RPC_URL` | Yes | Ethereum Sepolia JSON-RPC endpoint |
| `ISSUER_PRIVATE_KEY` | Write ops only | Private key for the authorized issuer signer |
| `DEPLOYER_PRIVATE_KEY` | Deployment only | Private key for the contract administrator/deployer |
| `ETHERSCAN_API_KEY` | Verification only | Etherscan API key for source verification |

### 3.2 Hardhat Keystore (Preferred)

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
npx hardhat keystore set ISSUER_PRIVATE_KEY
npx hardhat keystore set ETHERSCAN_API_KEY
```

Private keys must never be printed, shared, or committed to version control.

## 4. Document Hashing

### 4.1 Rules

- Hash the **exact raw certificate bytes** using SHA-256.
- The output must be 32 bytes, represented as `0x` followed by 64 hexadecimal characters.
- Pass that digest directly as Solidity `bytes32` to contract functions.

### 4.2 Prohibited Practices

| Incorrect Practice | Why It Fails |
|---|---|
| Uploading the document to the contract | Violates privacy; contract stores only hashes |
| Hashing a filename instead of content | Filename is not the document |
| Using a JSON string as input | Only valid if it is the agreed canonical representation |
| Using Keccak-256 instead of SHA-256 | Produces different hashes; breaks interoperability |

### 4.3 Example (Node.js)

```javascript
const { createHash } = require("crypto");

function hashDocument(buffer) {
  return "0x" + createHash("sha256").update(buffer).digest("hex");
}
```

## 5. Issuance Flow

```
Step 1: Receive raw certificate bytes
        |
Step 2: Compute SHA-256 hash -> documentHash (bytes32)
        |
Step 3: Validate hash format (0x + 64 hex chars, non-zero)
        |
Step 4: Call issueCertificate(documentHash) via ethers v6 signer
        |
Step 5: Wait for transaction receipt (confirmations >= 1)
        |
Step 6: Verify on-chain status is ACTIVE via verifyCertificate()
```

### 5.1 Contract Preconditions

| Check | Error |
|---|---|
| Signer has `ISSUER_ROLE` | `IssuerNotAuthorized` |
| `documentHash != bytes32(0)` | `InvalidDocumentHash` |
| Hash not already registered | `CertificateAlreadyExists` |

### 5.2 On-Chain State After Issuance

```
Certificate {
  issuer:     <signer address>,
  issuedAt:   <block.timestamp>,
  revokedAt:  0,
  status:     ACTIVE (1)
}
```

### 5.3 Emitted Event

```
CertificateIssued(bytes32 indexed documentHash, address indexed issuer, uint64 issuedAt)
```

## 6. Verification Flow

```
Step 1: Receive raw certificate bytes (or known hash)
        |
Step 2: Compute or use existing SHA-256 hash -> documentHash
        |
Step 3: Call verifyCertificate(documentHash) -> CertificateStatus
        |
Step 4: If ACTIVE, optionally call getCertificate(documentHash) for full record
        |
Step 5: Return status to caller
```

### 6.1 Verification Status Values

| Value | Name | Meaning |
|---:|---|---|
| `0` | `NOT_FOUND` | Hash has never been issued on-chain |
| `1` | `ACTIVE` | Certificate was issued and has not been revoked |
| `2` | `REVOKED` | Certificate was permanently revoked |

### 6.2 getCertificate Response

```solidity
struct Certificate {
  address issuer;      // Address that issued the certificate
  uint64  issuedAt;    // Block timestamp of issuance (unix seconds)
  uint64  revokedAt;   // Block timestamp of revocation (0 if active)
  CertificateStatus status;  // NOT_FOUND, ACTIVE, or REVOKED
}
```

## 7. Revocation Flow

```
Step 1: Identify the documentHash to revoke
        |
Step 2: Call revokeCertificate(documentHash) via ethers v6 signer
        |
Step 3: Wait for transaction receipt
        |
Step 4: Verify on-chain status is REVOKED
```

### 7.1 Authorization Rules

| Caller | May Revoke |
|---|---|
| Original issuer of the certificate | Yes |
| Administrator (`ADMIN_ROLE`) | Yes |
| Any other address | No (`UnauthorizedRevoker`) |

### 7.2 Contract Preconditions

| Check | Error |
|---|---|
| Certificate exists (status != NOT_FOUND) | `CertificateNotFound` |
| Certificate not already revoked | `CertificateAlreadyRevoked` |
| Caller is original issuer or admin | `UnauthorizedRevoker` |

### 7.3 Emitted Event

```
CertificateRevoked(bytes32 indexed documentHash, address indexed issuer, address indexed revokedBy, uint64 revokedAt)
```

## 8. Issuer Identity and Authorization

### 8.1 Identity Model

The prototype uses Ethereum addresses as issuer identities. The deployer receives `ADMIN_ROLE` upon contract construction. Issuers are authorized by the administrator through `authorizeIssuer()`.

### 8.2 Role Hierarchy

```
ADMIN_ROLE
    |
    +-- authorizeIssuer(address)
    +-- removeIssuer(address)
    +-- revokeCertificate(bytes32)  [any certificate]
    |
ISSUER_ROLE (managed by ADMIN_ROLE)
    |
    +-- issueCertificate(bytes32)
    +-- revokeCertificate(bytes32)  [own certificates only]
```

### 8.3 Sepolia Deployed Roles

| Role | Address |
|---|---|
| Administrator (deployer) | `0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447` |
| Authorized issuer | `0x4e02876F9bfd58f9D2D542F9520055BeD3addd28` |

### 8.4 Design Constraints

- Inherited `grantRole`, `revokeRole`, and `renounceRole` are disabled.
- Only `authorizeIssuer()` and `removeIssuer()` manage issuer membership.
- Removing an issuer blocks future issuance but does not revoke existing certificates.

## 9. Blockchain Adapter (ethers v6)

### 9.1 Provider Setup

```javascript
const { JsonRpcProvider } = require("ethers");
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
```

### 9.2 Signer Setup

```javascript
const { Wallet } = require("ethers");
const signer = new Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
```

### 9.3 Contract Instance

```javascript
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
```

### 9.4 Transaction Lifecycle

1. Call the contract write function (returns `TransactionResponse`).
2. Wait for confirmation: `await tx.wait(1)`.
3. Check `receipt.status === 1` for success.
4. Parse events from `receipt.logs` if needed.

### 9.5 Read Operations

Read operations (`verifyCertificate`, `getCertificate`, `isAuthorizedIssuer`) do not require a signer and can use a read-only provider:

```javascript
const readContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
const status = await readContract.verifyCertificate(documentHash);
```

## 10. Security Model

### 10.1 Privacy Boundary

| Stored On-Chain | Never Stored On-Chain |
|---|---|
| SHA-256 document hash | Raw certificate file |
| Issuer address | Citizen identity or PII |
| Issuance timestamp | Contact details or marks |
| Revocation timestamp | Detailed revocation reasons |
| Certificate status | Certificate contents |

### 10.2 Key Management

| Rule | Detail |
|---|---|
| Private keys server-side only | Never embed in frontend or client code |
| No key sharing | Each issuer controls its own key |
| No real assets on dev keys | Hardhat test addresses are temporary |
| Use keystore in development | `npx hardhat keystore set` over plain `.env` |

### 10.3 Contract Security

- Non-upgradeable; no proxy pattern.
- No external calls to untrusted contracts.
- OpenZeppelin `AccessControl` for role enforcement.
- Block timestamps are blockchain metadata, not precise wall-clock time.

## 11. Error Reference

### 11.1 Contract Errors

| Error | Trigger |
|---|---|
| `InvalidIssuerAddress` | Zero address passed to `authorizeIssuer` or `removeIssuer` |
| `IssuerAlreadyAuthorized` | Issuer already has `ISSUER_ROLE` |
| `IssuerNotAuthorized` | Issuer lacks `ISSUER_ROLE` |
| `InvalidDocumentHash` | Zero `bytes32` passed to `issueCertificate` |
| `CertificateAlreadyExists` | Hash already registered on-chain |
| `CertificateNotFound` | Hash not registered when revocation attempted |
| `CertificateAlreadyRevoked` | Hash already revoked |
| `UnauthorizedRevoker` | Caller is not the original issuer or admin |
| `DirectRoleManagementDisabled` | Direct `grantRole`/`revokeRole`/`renounceRole` call |

## 12. Testing

### 12.1 Local Test Suite

```bash
npm test
```

Covers all contract functions, authorization rules, error conditions, and event emissions.

### 12.2 Local Demonstration

```bash
npm run local:demo
```

Deploys a fresh contract and runs the full lifecycle: authorize issuer, hash document, issue certificate, verify ACTIVE, revoke, verify REVOKED.

### 12.3 Coverage

```bash
npm run coverage
```

Generates Solidity line, branch, and function coverage reports.

## 13. Deferred and Future Features

### 13.1 Deferred (Not Implemented)

| Feature | Purpose |
|---|---|
| HSM integration | Hardware security module for key custody |
| Cloud KMS | Managed key signing (AWS KMS, GCP Cloud KMS, Azure Key Vault) |
| PKI | X.509 certificate chain for issuer identity |
| Holder binding | Cryptographic proof linking certificate to a citizen wallet |
| Zero-knowledge proofs | Privacy-preserving verification without revealing certificate contents |

### 13.2 Production Enhancements

- Replace environment-based signing with HSM/KMS.
- Implement PKI for issuer identity attestation.
- Add holder binding for citizen wallet ownership proof.
- Enable multisignature control for administrative operations.
- Add monitoring, alerting, and audit logging.
- Consider upgradeability patterns if needed post-deployment.

## 14. Contract Reference

| Item | Value |
|---|---|
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract address | `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` |
| Solidity version | `0.8.28` |
| License | MIT |
| Source verified | [Etherscan](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |

## 15. Related Documentation

| Document | Purpose |
|---|---|
| `CONTRACT_DESIGN.md` | Detailed contract specification and state transitions |
| `BACKEND_HANDOFF.md` | Backend integration reference |
| `BACKEND_API.md` | API endpoint configuration and security rules |
| `BACKEND_SAMPLES.md` | API request and response examples |
| `SEPOLIA_DEPLOYMENT.md` | Deployment evidence and transaction records |
| `SEPOLIA_PREPARATION.md` | Network and secret preparation guide |
| `STAGE8_DEMONSTRATION.md` | Local execution evidence |
| `STAGE9_VALIDATION.md` | Clean-install validation evidence |
| `STAGE10_VALIDATION.md` | Stage 10 local validation evidence |
| `FRONTEND_INTEGRATION.md` | Frontend integration reference |
