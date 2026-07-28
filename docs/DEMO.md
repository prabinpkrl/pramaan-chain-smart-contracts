# PramaanChain — Demo Guide

## What Is PramaanChain?

PramaanChain is an **on-chain certificate proof registry** built on Ethereum Sepolia. It stores SHA-256 hashes of documents (never the documents themselves or any personal data) to provide tamper-proof proof-of-existence and revocation status.

### Problem It Solves

Certificate fraud — forged diplomas, fake experience letters, counterfeit credentials. By anchoring certificate hashes on-chain, anyone can verify a document's authenticity without trusting a central authority.

---

## Architecture Overview

```
┌──────────────┐       HTTP        ┌─────────────────┐       JSON-RPC      ┌──────────────────┐
│              │ ────────────────> │                 │ ───────────────────> │                  │
│  Frontend /  │                   │  Backend API    │                      │  PramaanChain    │
│  curl Client │ <──────────────── │  (Express.js)   │ <─────────────────── │  Smart Contract  │
│              │                   │                 │                      │  (Sepolia)       │
└──────────────┘                   └─────────────────┘                      └──────────────────┘
                                         │                                        │
                                    No database                          Stores only:
                                    All state is                         - SHA-256 hash
                                    on-chain                             - Issuer address
                                                                         - Timestamps
                                                                         - Status
```

**Key principle:** The backend stores NO certificate data. All state lives on the Ethereum blockchain. The backend is a pass-through gateway with indexing, authentication, and rate limiting.

---

## Smart Contract: PramaanChain.sol

**Deployed on Sepolia:**
- Address: `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`
- Block: `11318772`
- Solidity: `0.8.28`
- Uses OpenZeppelin `AccessControl`

### Roles

| Role | Who | Permissions |
|------|-----|-------------|
| `ADMIN_ROLE` | Deployer | Authorize/remove issuers, revoke any certificate |
| `ISSUER_ROLE` | Granted by admin | Issue new certificates, revoke own certificates |

### Certificate Lifecycle

```
  NOT_FOUND  ──── issueCertificate() ────>  ACTIVE  ──── revokeCertificate() ────>  REVOKED
                      (permanent)                                    (permanent, one-way)
```

- No reissuance. No reactivation. No editing.
- A revoked hash is permanently reserved — it can never be reissued.

### What Gets Stored On-Chain

```solidity
struct Certificate {
    address issuer;        // Who issued it
    uint64  issuedAt;      // Block timestamp
    uint64  revokedAt;     // Block timestamp (0 if not revoked)
    CertificateStatus status;  // NOT_FOUND=0, ACTIVE=1, REVOKED=2
}
```

**Nothing else.** No document content, no names, no marks, no personal data.

---

## Backend API

### Running the Backend

```bash
cd backend
npm install
node src/server.js
# Server starts on http://localhost:3000
```

### Read Endpoints (Public)

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Server status, chain info, index state |
| `GET /api/verify/:documentHash` | Verify a certificate's status |
| `GET /api/certificates/:documentHash` | Get full certificate record |
| `GET /api/issuer/:address` | Check if an address is an authorized issuer |
| `GET /api/events?from=&to=` | Raw blockchain events |
| `GET /api/events/transformed?type=&from=&to=` | Frontend-friendly events |
| `GET /api/certificates?status=&issuer=&page=&limit=` | Paginated certificate list |
| `GET /api/certificates/summary` | Total/active/revoked counts |

### Write Endpoints (Authenticated)

| Endpoint | Description |
|----------|-------------|
| `POST /api/write/issue` | Issue a certificate hash on-chain |
| `POST /api/write/revoke` | Revoke a certificate on-chain |

Write endpoints require:
- `x-api-key` header (matches `WRITE_API_KEY` env var)
- `Idempotency-Key` header (unique per request)
- `Content-Type: application/json`

---

## Demo: End-to-End Flow

### Step 1: Compile the Contract

```bash
npm run compile
```

### Step 2: Start a Local Hardhat Node

```bash
npm run local:node
```

### Step 3: Deploy and Run the Full Demo

```bash
npm run local:demo
```

This runs `scripts/demo.js` which:
1. Deploys a fresh PramaanChain contract
2. Authorizes an issuer address
3. Generates a SHA-256 hash from a test label
4. Issues a certificate with that hash
5. Verifies the certificate is ACTIVE
6. Revokes the certificate
7. Verifies the certificate is REVOKED

### Step 4: Deploy to Sepolia

```bash
npm run sepolia:deploy-demo
```

### Step 5: Verify on Etherscan

```bash
npm run sepolia:verify
```

---

## Testing

### Contract Tests

```bash
npm test
```

42+ tests covering:
- Deployment and role setup
- Issuer authorization and removal
- Certificate issuance (valid cases and edge cases)
- Certificate verification (ACTIVE, REVOKED, NOT_FOUND)
- Certificate revocation (issuer, admin, unauthorized)
- Role mutation boundaries (direct grants blocked)
- Event signatures and ABI inspection

### Backend Tests

```bash
cd backend
npm test
```

Covers:
- Express app integration (CORS, rate limiting, 503 responses)
- API key authentication
- Block range normalization
- Idempotency (deduplication, replay, conflict detection)
- Hash validation
- Secret redaction

---

## Privacy Model

| Data | On-Chain? | In Backend? |
|------|-----------|-------------|
| Document content | Never | Never |
| Personal data | Never | Never |
| SHA-256 hash | Yes | No (read from chain) |
| Issuer address | Yes | No (read from chain) |
| Timestamps | Yes | No (read from chain) |
| Status | Yes | No (read from chain) |

The backend rejects any attempt to include extra fields in write requests. The contract ABI contains no personal-data terms or certificate-editing functions.

---

## Key Commands Reference

```bash
# Root (smart contract)
npm run compile          # Compile Solidity
npm test                 # Run contract tests
npm run coverage         # Solidity coverage
npm run local:node       # Start local Hardhat node
npm run local:deploy     # Deploy to local node
npm run local:demo       # Full lifecycle demo on local node
npm run sepolia:deploy-demo  # Full lifecycle on Sepolia
npm run sepolia:verify   # Etherscan verification
npm run clean            # Remove build artifacts

# Backend
cd backend
node src/server.js       # Start backend server (port 3000)
node --watch src/server.js   # Start with auto-restart on file changes
npm test                 # Run backend tests
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEPOLIA_RPC_URL` | Yes | Sepolia RPC endpoint |
| `PRAMAAN_CHAIN_ADDRESS` | Yes | Deployed contract address |
| `BLOCKCHAIN_CHAIN_ID` | No | Defaults to `11155111` (Sepolia) |
| `ISSUER_ADDRESS` | For writes | Issuer wallet address |
| `ISSUER_PRIVATE_KEY` | For writes | Issuer wallet private key |
| `WRITE_API_KEY` | For writes | API key for write endpoints |
| `PORT` | No | Server port (default: 3000) |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated allowed origins |
| `BLOCKCHAIN_CONFIRMATIONS` | No | Confirmations before finality (default: 2) |

---

## What's NOT Included (Future Work)

- Mainnet deployment
- Persistent database or queuing
- Frontend application
- QR code generation
- Document storage
- Production key management (KMS/HSM/Vault)
- Monitoring and alerting
- Multisig admin recovery
- Zero-knowledge proofs
