# PramaanChain Backend API Documentation

## 1. Overview

This document describes the PramaanChain backend REST API. The backend
integrates with the `PramaanChain` smart contract on Sepolia to provide
certificate issuance, verification, revocation, and event indexing.

The backend is a Node.js Express server using ethers v6 for blockchain
interaction. It does not store certificate data — all state lives on-chain.
Original documents and personal information remain off-chain under the
application's own authorization and retention policies.

### 1.1 Service boundary

| Operation | Blockchain connection | Gas required | Access rule |
| --- | --- | --- | --- |
| `verifyCertificate` | Provider only | None | Public or rate-limited |
| `getCertificate` | Provider only | None | Public or rate-limited |
| `isAuthorizedIssuer` | Provider only | None | Internal health check or public lookup |
| `issueCertificate` | Issuer signer | Sepolia ETH | Authenticated institution mapped to that signer |
| `revokeCertificate` | Original issuer signer | Sepolia ETH | Authenticated original issuer or administrator |
| Event indexing | Provider only | None | Internal indexing service |

### 1.2 Security boundary

- The backend never exposes private keys, RPC credentials, or signer
  material through API responses or logs.
- Read-only operations require no wallet or gas.
- Write operations require a configured issuer signer with sufficient
  Sepolia ETH and on-chain authorization.
- Administrator functions (`authorizeIssuer`, `removeIssuer`) are not
  exposed through this API. They remain a separate blockchain-lead
  operation.

## 2. Requirements

- Node.js `22.13.0` or newer
- A Sepolia RPC URL (e.g., from Alchemy or Infura)
- A test-only issuer wallet with Sepolia ETH (for write operations)
- The deployed `PramaanChain` contract address on Sepolia

### 2.1 Sepolia deployment details

| Item | Value |
| --- | --- |
| Contract address | `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` |
| Chain ID | `11155111` |
| Deployment block | `11318772` |
| Deployment commit | `73a711d0694197e70e2c262fffd587183c7414fa` |
| Administrator | `0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447` |
| Authorized issuer | `0x4e02876F9bfd58f9D2D542F9520055BeD3addd28` |
| Etherscan | [Verified source](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |

## 3. Installation

```bash
cd backend
npm ci
cp .env.example .env
# Edit .env with your values
```

## 4. Configuration

All configuration is loaded from environment variables via `dotenv`. Copy
`.env.example` to `.env` and fill in the values.

### 4.1 Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BLOCKCHAIN_NETWORK` | No | `sepolia` | Network name (informational) |
| `BLOCKCHAIN_CHAIN_ID` | No | `11155111` | Expected chain ID — startup rejects mismatches |
| `PRAMAAN_CHAIN_ADDRESS` | Yes | — | Deployed `PramaanChain` contract address |
| `PRAMAAN_CHAIN_START_BLOCK` | No | `11318772` | Block number to begin event indexing |
| `SEPOLIA_RPC_URL` | Yes | — | HTTP RPC endpoint for Sepolia |
| `ISSUER_PRIVATE_KEY` | For writes | — | Test-only issuer wallet private key |
| `BLOCKCHAIN_CONFIRMATIONS` | No | `2` | Block confirmations before treating a write as final |
| `PORT` | No | `3000` | HTTP server listen port |

### 4.2 Example .env

```dotenv
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
PRAMAAN_CHAIN_START_BLOCK=11318772
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ISSUER_PRIVATE_KEY=0xYOUR_TEST_ONLY_KEY
BLOCKCHAIN_CONFIRMATIONS=2
PORT=3000
```

### 4.3 Secret handling

- Never commit `.env`, private keys, or RPC credentials to source control.
- The issuer wallet must be test-only, funded only with limited faucet
  Sepolia ETH, and not reused on mainnet.
- Browser bundles, mobile apps, logs, API responses, and client-visible
  environment variables must never contain signer keys.

## 5. Startup

```bash
npm start        # production
npm run dev      # development with file watching
```

### 5.1 Startup checks

The server performs the following checks before accepting traffic. Any
failure causes the process to exit with a non-zero code:

1. `SEPOLIA_RPC_URL` is set and the RPC is reachable.
2. The RPC reports chain ID matching `BLOCKCHAIN_CHAIN_ID` (default
   `11155111`).
3. `PRAMAAN_CHAIN_ADDRESS` resolves to a checksummed address with
   non-empty deployed bytecode.
4. The loaded ABI exposes all required functions: `verifyCertificate`,
   `getCertificate`, `isAuthorizedIssuer`, `issueCertificate`,
   `revokeCertificate`.
5. If `ISSUER_PRIVATE_KEY` is configured:
   - The wallet derives to a valid address.
   - `isAuthorizedIssuer(derivedAddress)` returns `true` on-chain.
   - A warning is logged if the issuer has zero Sepolia ETH balance.

If `ISSUER_PRIVATE_KEY` is not set, the server starts in read-only mode.
Write endpoints will return `503 Service Unavailable`.

## 6. Project structure

```text
backend/
├── .env.example                 Configuration template
├── package.json                 Dependencies and scripts
└── src/
    ├── abi.json                 PramaanChain contract ABI
    ├── server.js                Express entry point
    ├── services/
    │   ├── blockchain.js        Provider, contract, startup checks
    │   ├── certificate.js       Issue, verify, revoke, get
    │   └── events.js            Event indexer from deployment block
    ├── routes/
    │   ├── read.js              Public read endpoints
    │   ├── write.js             Issuer write endpoints
    │   └── events.js            Event query endpoint
    ├── middleware/
    │   ├── errors.js            Error-to-HTTP-status mapping
    │   └── rateLimit.js         Rate limiting configuration
    └── utils/
        └── hash.js              SHA-256 document hashing
```

### 6.1 Module responsibilities

| Module | Purpose |
| --- | --- |
| `services/blockchain.js` | Creates the ethers `JsonRpcProvider`, loads the ABI, instantiates read and write contract objects, validates chain ID and bytecode, verifies issuer authorization. Exports `getReadContract()`, `getWriteContract()`, `getProvider()`, `getIssuerAddress()`, `statusToName()`. |
| `services/certificate.js` | Business logic for `verifyCertificate`, `getCertificate`, `issueCertificate`, `revokeCertificate`, `isAuthorizedIssuer`. Validates document hashes, waits for confirmed receipts, and verifies post-write state. |
| `services/events.js` | Queries `CertificateIssued`, `CertificateRevoked`, `IssuerAuthorized`, and `IssuerRemoved` events from the deployment block. Uses `(transactionHash, logIndex)` as an idempotency key. Deduplicates and sorts by block number. |
| `routes/read.js` | Public read-only Express routes mounted at `/api`. |
| `routes/write.js` | Issuer write Express routes mounted at `/api/write`. Requires `ISSUER_PRIVATE_KEY`. |
| `routes/events.js` | Event query Express route mounted at `/api`. |
| `middleware/errors.js` | Central error handler mapping contract error messages to HTTP status codes. |
| `middleware/rateLimit.js` | Rate limiters: 60 reads/min, 10 writes/min per IP. |
| `utils/hash.js` | `hashDocumentBytes(bytes)` for SHA-256 hashing and `validateDocumentHash(hex)` for input validation. |

## 7. API reference

Base URL: `http://localhost:3000/api`

All responses are JSON. Content-Type: `application/json`.

### 7.1 Health check

```
GET /api/health
```

Returns server and blockchain connection status. No authentication
required.

**Response `200 OK`:**

```json
{
  "status": "ok",
  "chainId": "11155111",
  "blockNumber": 5800000,
  "issuerAddress": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "timestamp": "2026-07-23T12:00:00.000Z"
}
```

**Response `503 Service Unavailable`:**

```json
{
  "status": "error",
  "message": "Chain ID mismatch: expected 11155111, got 1"
}
```

---

### 7.2 Verify certificate

```
GET /api/verify/:documentHash
```

Returns the verification status and full certificate record for a document
hash. This is a read-only operation — no wallet or gas required.

The `:documentHash` parameter must be a `0x`-prefixed 64-character
hexadecimal string (32-byte SHA-256 digest).

**Response `200 OK` (active certificate):**

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0
}
```

**Response `200 OK` (unknown hash):**

```json
{
  "documentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "status": "NOT_FOUND",
  "issuer": "0x0000000000000000000000000000000000000000",
  "issuedAt": 0,
  "revokedAt": 0
}
```

**Response `200 OK` (revoked certificate):**

```json
{
  "documentHash": "0xabc123...",
  "status": "REVOKED",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 1721836800
}
```

**Response `400 Bad Request` (invalid hash format):**

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

**Status values:**

| Value | Name | Meaning |
| --- | --- | --- |
| `NOT_FOUND` | The hash has never been issued |
| `ACTIVE` | The hash was issued and has not been revoked |
| `REVOKED` | The certificate was permanently revoked |

---

### 7.3 Get certificate

```
GET /api/certificates/:documentHash
```

Returns the full certificate record. Identical to verify but expressed as
a resource-oriented endpoint.

**Response `200 OK`:**

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0
}
```

---

### 7.4 Check issuer authorization

```
GET /api/issuer/:address
```

Returns whether the given address is an authorized issuer on-chain.

**Response `200 OK`:**

```json
{
  "address": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "authorized": true
}
```

---

### 7.5 Issue certificate

```
POST /api/write/issue
```

Issues a new certificate on-chain. Requires a configured issuer signer
with `ISSUER_ROLE` on the contract. The request body must contain a
pre-computed SHA-256 document hash.

**Request body:**

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
}
```

**Response `201 Created`:**

```json
{
  "transactionHash": "0x...",
  "blockNumber": 5800123,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE"
}
```

**Response `400 Bad Request` (missing hash):**

```json
{
  "error": "documentHash is required"
}
```

**Response `403 Forbidden` (unauthorized issuer):**

```json
{
  "error": "not authorized"
}
```

**Response `503 Service Unavailable` (no signer configured):**

```json
{
  "error": "Write service not initialized (no ISSUER_PRIVATE_KEY)"
}
```

**Contract errors mapped to HTTP:**

| Contract error | HTTP status |
| --- | --- |
| `InvalidDocumentHash` | 400 |
| `CertificateAlreadyExists` | 409 (via error handler) |
| `AccessControlUnauthorizedAccount` | 403 |

---

### 7.6 Revoke certificate

```
POST /api/write/revoke
```

Permanently revokes a certificate on-chain. Only the original issuer or
an administrator can revoke. The backend verifies that the configured
signer matches the original issuer before submitting the transaction.

**Request body:**

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
}
```

**Response `200 OK`:**

```json
{
  "transactionHash": "0x...",
  "blockNumber": 5800456,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "REVOKED"
}
```

**Contract errors mapped to HTTP:**

| Contract error | HTTP status |
| --- | --- |
| `CertificateNotFound` | 404 |
| `CertificateAlreadyRevoked` | 409 |
| `UnauthorizedRevoker` | 403 |

---

### 7.7 Query events

```
GET /api/events?from=<block>&to=<block>
```

Returns decoded domain events from the `PramaanChain` contract. Defaults
to indexing from the deployment block (`11318772`) to the latest
confirmed block minus `BLOCKCHAIN_CONFIRMATIONS`.

**Query parameters:**

| Parameter | Required | Description |
| --- | --- | --- |
| `from` | No | Start block number (default: `11318772`) |
| `to` | No | End block number (default: latest - confirmations) |

**Response `200 OK`:**

```json
{
  "events": [
    {
      "eventName": "CertificateIssued",
      "blockNumber": 5800123,
      "blockHash": "0x...",
      "transactionHash": "0x...",
      "logIndex": 0,
      "args": {
        "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
        "issuedAt": "1721750400"
      }
    }
  ],
  "count": 1,
  "totalProcessed": 1
}
```

**Indexed event types:**

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |
| `IssuerAuthorized` | `issuer`, `administrator` | — |
| `IssuerRemoved` | `issuer`, `administrator` | — |

Events are deduplicated using `(transactionHash, logIndex)` as the
idempotency key and sorted by block number.

## 8. Error handling

All errors return a JSON body with an `error` field:

```json
{
  "error": "Human-readable error message"
}
```

### 8.1 HTTP status code mapping

| HTTP status | Meaning | Example triggers |
| --- | --- | --- |
| `400 Bad Request` | Invalid input | Missing or malformed `documentHash` |
| `403 Forbidden` | Not authorized | Issuer not authorized, not the original issuer |
| `502 Bad Gateway` | Blockchain transaction failed | On-chain revert, receipt null or failed |
| `503 Service Unavailable` | Service not ready | Blockchain not initialized, write signer not configured |
| `500 Internal Server Error` | Unexpected failure | Unhandled exceptions |

### 8.2 Error messages

| Message | Status | Cause |
| --- | --- | --- |
| `documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)` | 400 | Hash format validation failed |
| `documentHash is required` | 400 | POST body missing `documentHash` |
| `not authorized` | 403 | Configured issuer not authorized on-chain |
| `not the original certificate issuer` | 403 | Revocation attempted by non-original issuer |
| `Write service not initialized (no ISSUER_PRIVATE_KEY)` | 503 | No issuer key configured |
| `Blockchain not initialized` | 503 | Startup failed or provider unavailable |
| `Blockchain transaction failed: 0x...` | 502 | On-chain transaction reverted |

## 9. Rate limiting

| Scope | Limit | Window | Headers |
| --- | --- | --- | --- |
| Read endpoints (`/api/*`) | 60 requests | 1 minute | `RateLimit-*` standard headers |
| Write endpoints (`/api/write/*`) | 10 requests | 1 minute | `RateLimit-*` standard headers |

Rate limits are applied per IP address. When the limit is exceeded, the
response is `429 Too Many Requests`:

```json
{
  "error": "Too many requests, please try again later"
}
```

## 10. Document hashing

The backend expects document hashes to be SHA-256 digests of the raw
document bytes. The hash must be passed as a `0x`-prefixed 64-character
hexadecimal string.

### 10.1 Hashing rules

1. Hash the exact raw document bytes (not a filename, path, base64 string,
   or JSON serialization).
2. Use SHA-256 (not Keccak-256 or any other hash function).
3. The resulting 32 bytes map directly to Solidity `bytes32` — do not pad,
   truncate, or re-hash.
4. Hashing must be deterministic: the same document bytes must produce the
   same hash in both issuance and verification paths.

### 10.2 Example with ethers

```js
import { readFile } from "node:fs/promises";
import { sha256 } from "ethers";

const documentBytes = await readFile("certificate.pdf");
const documentHash = sha256(documentBytes);
// "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
```

### 10.3 Validation

The backend validates every incoming `documentHash` before making any
on-chain call:

```js
import { isHexString, dataLength } from "ethers";

if (!isHexString(hash) || dataLength(hash) !== 32) {
  throw new Error("documentHash must be a 0x-prefixed 32-byte hex string");
}
```

## 11. Transaction handling

Write operations follow this flow:

1. Validate the document hash format off-chain.
2. Submit the transaction through the authorized issuer signer.
3. Wait for `BLOCKCHAIN_CONFIRMATIONS` blocks (default: 2) for the
   receipt.
4. Verify `receipt.status === 1` (success).
5. Perform a read-only post-check: `verifyCertificate` must return the
   expected status (`ACTIVE` after issuance, `REVOKED` after revocation).
6. Return the transaction hash, block number, document hash, and
   confirmed status.

The backend does **not** mark a write successful merely because a
transaction hash was returned. A receipt with successful status and
post-verification are both required.

### 11.1 Nonce management

The backend uses ethers v6 default nonce management (querying the pending
nonce from the RPC). For deployments with concurrent write traffic, a
nonce manager or transaction queue should be added.

### 11.2 Retry policy

Failed transactions are not automatically retried. The API returns the
error to the caller, who can decide whether to resubmit. Idempotency is
ensured by the contract's `CertificateAlreadyExists` check — reissuing
the same hash will fail on-chain.

## 12. Event indexing

### 12.1 Indexed events

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |
| `IssuerAuthorized` | `issuer`, `administrator` | — |
| `IssuerRemoved` | `issuer`, `administrator` | — |

### 12.2 Idempotency

Events are deduplicated using `(transactionHash, logIndex)` as a stable
key. Duplicate delivery from the RPC provider is handled gracefully.

### 12.3 Chain reorganization

Events are kept unfinalized until the configured confirmation depth is
reached. The default `BLOCKCHAIN_CONFIRMATIONS=2` means events from the
latest block minus 2 are considered final. The event indexer uses the
provider's `getBlockNumber()` minus `BLOCKCHAIN_CONFIRMATIONS` as the
safe upper bound.

### 12.4 Querying

Events can be queried through the `/api/events` endpoint with optional
`from` and `to` block range parameters. The default range starts from the
deployment block (`11318772`).

## 13. Privacy and security

- On-chain state, transaction inputs, and events are public on the
  Sepolia testnet.
- A document digest is a stable fingerprint, not encryption or access
  control.
- The backend rejects attempts to place personal information, document
  contents, or detailed revocation reasons into any transaction-associated
  metadata.
- Original documents and citizen data remain off-chain under the
  application's own authorization, retention, encryption, and deletion
  policies.
- Certificate records cannot be edited, reissued, reactivated, or
  deleted.
- The `ISSUER_PRIVATE_KEY` must never appear in API responses, logs,
  source control, or client-side code.

## 14. Known limitations

This backend is a Sepolia prototype integration. The following are not
implemented:

- Production network deployment or mainnet signing;
- persistent event storage or database integration;
- authentication or authorization middleware for API consumers;
- frontend, QR code, or citizen workflow integration;
- KMS, HSM, Vault, or production key management;
- monitoring, alerting, or structured logging;
- nonce management for concurrent write traffic;
- automatic retry or dead-letter queues for failed transactions;
- batch issuance; or
- zero-knowledge proof verification.

These require separate design and explicit authorization.

## 15. Running locally

### 15.1 Start the local Hardhat node

From the project root:

```bash
npm run local:node
```

### 15.2 Deploy the contract

```bash
npm run local:deploy
```

Note the printed `contractAddress`.

### 15.3 Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```dotenv
BLOCKCHAIN_CHAIN_ID=31337
PRAMAAN_CHAIN_ADDRESS=<printed-contract-address>
SEPOLIA_RPC_URL=http://127.0.0.1:8545
ISSUER_PRIVATE_KEY=<hardhat-account-private-key>
BLOCKCHAIN_CONFIRMATIONS=1
PORT=3000
```

### 15.4 Start the backend

```bash
npm start
```

### 15.5 Test the endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Verify a hash (returns NOT_FOUND for unknown hashes)
curl http://localhost:3000/api/verify/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81

# Issue a certificate
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'

# Revoke a certificate
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'

# Check issuer authorization
curl http://localhost:3000/api/issuer/0x4e02876F9bfd58f9D2D542F9520055BeD3addd28

# Query events
curl http://localhost:3000/api/events?from=11318772
```
