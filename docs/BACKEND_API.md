# PramaanChain Backend API Documentation

## 1. Overview

This document describes the PramaanChain backend REST API. The backend
integrates with the `PramaanChain` smart contract on Sepolia to provide
certificate issuance, verification, revocation, and event indexing.

The backend is a Node.js Express server using ethers v6 for blockchain
interaction. It does not store certificate data — all state lives on-chain.
Original documents and personal information remain off-chain under the
application's own authorization and retention policies.

This gateway is distinct from `app-backend/`, which now implements SIWE,
private institution relationships, and browser-wallet transaction
confirmation. The React frontend uses this gateway for public reads and does
not call its protected server-side write routes.

### 1.1 Service boundary

| Operation | Blockchain connection | Gas required | Access rule |
| --- | --- | --- | --- |
| `verifyCertificate` | Provider only | None | Public or rate-limited |
| `getCertificate` | Provider only | None | Public or rate-limited |
| `isAuthorizedIssuer` | Provider only | None | Internal health check or public lookup |
| `issueCertificate` | Configured issuer signer | Sepolia ETH | Valid `WRITE_API_KEY` and `Idempotency-Key` |
| `revokeCertificate` | Configured original issuer signer | Sepolia ETH | Valid `WRITE_API_KEY` and `Idempotency-Key`; no administrator key is loaded |
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

### 1.3 Nonce and replay concepts

The gateway has two blockchain-write protections. Citizen wallet login is
implemented separately in `app-backend/`:

| Concept | Implemented? | Purpose |
| --- | --- | --- |
| Ethereum transaction nonce | Yes | ethers `NonceManager` assigns the issuer wallet's transaction sequence and reloads it after a definite pre-broadcast failure |
| HTTP `Idempotency-Key` | Yes | Prevents one logical issue/revoke request from producing duplicate blockchain transactions |
| SIWE challenge nonce | In `app-backend/` | Proves wallet control using a short-lived, single-use signed message |

An Ethereum transaction nonce is blockchain transaction ordering, not a login
challenge. An `Idempotency-Key` is an application request identifier and does
not prove wallet ownership.

At startup, the gateway derives the issuer public address from
`ISSUER_PRIVATE_KEY`, matches it against `ISSUER_ADDRESS`, and reads its
current on-chain issuer authorization. It does not authenticate citizen
wallets or create user sessions because those responsibilities belong to the
private application backend.

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
| `SEPOLIA_RPC_URL` | Yes | — | HTTP Sepolia RPC; event features require historical `eth_getLogs` support |
| `ISSUER_ADDRESS` | With issuer key | — | Expected public address derived from the configured issuer key |
| `ISSUER_PRIVATE_KEY` | For writes | — | Test-only issuer wallet private key |
| `WRITE_API_KEY` | For writes | — | Long random server-side key required in the `x-api-key` header |
| `CORS_ALLOWED_ORIGINS` | No | empty | Comma-separated browser origins; server-to-server calls do not send an origin |
| `BLOCKCHAIN_CONFIRMATIONS` | No | `2` | Block confirmations before treating a write as final |
| `RPC_REQUEST_TIMEOUT_MS` | No | `30000` | Maximum duration of an individual RPC request |
| `TRANSACTION_WAIT_TIMEOUT_MS` | No | `180000` | Maximum receipt-confirmation wait before returning an ambiguous-write error |
| `EVENT_QUERY_CHUNK_SIZE` | No | `10000` | Maximum block count in one RPC log query |
| `EVENT_MAX_RANGE` | No | `100000` | Maximum block range accepted by event endpoints |
| `INDEX_POLL_INTERVAL_MS` | No | `15000` | Certificate-index synchronization interval |
| `INDEX_MAX_RETRY_INTERVAL_MS` | No | `300000` | Maximum event-index retry backoff |
| `IDEMPOTENCY_STORE_PATH` | No | `.data/idempotency.json` | Gitignored single-process operation journal |
| `TRUST_PROXY` | No | `false` | Express proxy trust: `false` or the exact trusted proxy-hop count (`1`–`10`) |
| `PORT` | No | `3000` | HTTP server listen port |

`TRUST_PROXY` is not required for local or direct development and should
remain `false`. Set an exact hop count only when a known reverse proxy such as
Nginx, Cloudflare, or a platform load balancer sits in front of Express. This
allows per-IP rate limiting to use the forwarded client address. A frontend
calling the API does not by itself require proxy trust.

### 4.2 Example .env

```dotenv
BLOCKCHAIN_NETWORK=sepolia
BLOCKCHAIN_CHAIN_ID=11155111
PRAMAAN_CHAIN_ADDRESS=0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
PRAMAAN_CHAIN_START_BLOCK=11318772
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ISSUER_ADDRESS=0x4e02876F9bfd58f9D2D542F9520055BeD3addd28
ISSUER_PRIVATE_KEY=0xYOUR_TEST_ONLY_KEY
WRITE_API_KEY=replace-with-a-long-random-value
CORS_ALLOWED_ORIGINS=http://localhost:5173
BLOCKCHAIN_CONFIRMATIONS=2
RPC_REQUEST_TIMEOUT_MS=30000
TRANSACTION_WAIT_TIMEOUT_MS=180000
EVENT_QUERY_CHUNK_SIZE=10000
EVENT_MAX_RANGE=100000
INDEX_POLL_INTERVAL_MS=15000
INDEX_MAX_RETRY_INTERVAL_MS=300000
IDEMPOTENCY_STORE_PATH=.data/idempotency.json
TRUST_PROXY=false
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
   - The derived address exactly matches `ISSUER_ADDRESS`.
   - Current issuer authorization is read from the contract.
   - A warning is logged if the issuer has zero Sepolia ETH balance.

If `ISSUER_PRIVATE_KEY` is not set, the server starts in read-only mode.
Write endpoints also fail closed with `503 Service Unavailable` when
`WRITE_API_KEY` is absent. A removed original issuer remains able to revoke
its earlier certificates, but issuance is disabled until the address is
authorized again.

After the mandatory connection checks pass, the HTTP server starts and builds
the historical certificate index in the background. Health and direct
verification remain usable while indexing. If the RPC cannot serve historical
logs, index-backed list/summary endpoints return `503`, health reports the
degraded index state, and retries use exponential backoff instead of a fixed
error loop.

## 6. Project structure

```text
backend/
├── .env.example                 Configuration template
├── package.json                 Dependencies and scripts
├── test/                        Node test-runner unit and API tests
└── src/
    ├── abi.json                 PramaanChain contract ABI
    ├── config.js                Validated environment configuration
    ├── server.js                Express entry point
    ├── services/
    │   ├── blockchain.js        Provider, contract, startup checks
    │   ├── certificate.js       Issue, verify, revoke, get
    │   ├── certificateIndex.js  Continuously synchronized certificate index
    │   ├── events.js            Stable confirmed event queries
    │   └── idempotency.js       Persistent single-process write idempotency
    ├── routes/
    │   ├── read.js              Public read endpoints
    │   ├── write.js             Issuer write endpoints
    │   ├── events.js            Raw event query endpoint
    │   └── eventsTransformed.js Frontend-friendly event endpoint
    ├── middleware/
    │   ├── authenticateWrite.js Fail-closed write API authentication
    │   ├── errors.js            Error-to-HTTP-status mapping
    │   └── rateLimit.js         Rate limiting configuration
    └── utils/
        └── hash.js              SHA-256 document hashing
```

### 6.1 Module responsibilities

| Module | Purpose |
| --- | --- |
| `services/blockchain.js` | Creates the provider and contract clients, loads the ABI, validates chain ID and bytecode, pins the expected issuer address, and wraps the signer in ethers `NonceManager`. |
| `services/certificate.js` | Serializes writes, performs preflight validation, waits for confirmed receipts, reads authoritative post-write records, and maps contract errors safely. |
| `services/certificateIndex.js` | Builds and polls a confirmed in-memory certificate index in bounded RPC chunks, with checkpoint-based reorganization detection. |
| `services/events.js` | Returns stable, named, confirmed domain events for bounded block ranges. Repeating a GET returns the same events. |
| `services/idempotency.js` | Requires an `Idempotency-Key`, persists completed and ambiguous operations atomically, and prevents restart-time duplicate submission in one process. |
| `routes/read.js` | Public read-only Express routes mounted at `/api`. |
| `routes/write.js` | Issuer write routes. Requires `x-api-key`, `Idempotency-Key`, and a configured issuer signer. |
| `routes/events.js` | Event query Express route mounted at `/api`. |
| `middleware/errors.js` | Central structured error handler; unexpected provider errors are not exposed. |
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
  "error": {
    "code": "INVALID_DOCUMENT_HASH",
    "message": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
  }
}
```

**Status values:**

| Value | Name | Meaning |
| --- | --- | --- |
| `0` | `NOT_FOUND` | The hash has never been issued |
| `1` | `ACTIVE` | The hash was issued and has not been revoked |
| `2` | `REVOKED` | The certificate was permanently revoked |

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

### 7.5 List indexed certificates

```
GET /api/certificates?status=ACTIVE&issuer=0x4e02...&page=1&limit=20
```

Returns one current record per issued hash from the confirmed event index.

| Query | Default | Rule |
| --- | --- | --- |
| `status` | all | `ACTIVE` or `REVOKED` |
| `issuer` | all | Valid Ethereum address |
| `page` | `1` | Positive integer |
| `limit` | `20` | Integer from 1 to 100 |

**Response `200 OK`:**

```json
{
  "certificates": [
    {
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "status": "ACTIVE",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "issuedAt": 1721750400,
      "revokedAt": 0,
      "issueTxHash": "0x...",
      "issueBlockNumber": 11318774,
      "revokeTxHash": null,
      "revokeBlockNumber": null,
      "revokedBy": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  },
  "summary": {
    "total": 1,
    "active": 1,
    "revoked": 0
  },
  "index": {
    "ready": true,
    "degraded": false
  }
}
```

If historical indexing has not completed, this endpoint returns `503` with
`CERTIFICATE_INDEX_NOT_READY`. Direct `/api/verify/:documentHash` calls remain
available.

---

### 7.6 Certificate summary

```
GET /api/certificates/summary
```

Returns confirmed totals and index health:

```json
{
  "total": 45,
  "active": 40,
  "revoked": 5,
  "indexSize": 45,
  "index": {
    "ready": true,
    "degraded": false,
    "size": 45,
    "lastProcessedBlock": 11320000
  }
}
```

---

### 7.7 Issue certificate

```
POST /api/write/issue
```

Issues a new certificate on-chain. Requires a configured issuer signer
with `ISSUER_ROLE` on the contract. The request body must contain a
pre-computed SHA-256 document hash. It also requires:

```http
x-api-key: <WRITE_API_KEY>
Idempotency-Key: <unique-operation-id>
Content-Type: application/json
```

Only `documentHash` is accepted in the JSON body. Extra fields, including
personal information, are rejected.

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
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "replayed": false
}
```

Repeating the same operation with the same idempotency key and body returns
the saved result with `replayed: true`. Reusing that key with a different
body returns `409 Conflict`.

**Response `400 Bad Request` (missing hash):**

```json
{
  "error": {
    "code": "DOCUMENT_HASH_REQUIRED",
    "message": "documentHash must be a non-empty string"
  }
}
```

**Response `401 Unauthorized` (invalid API key):**

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "A valid x-api-key header is required"
  }
}
```

**Response `503 Service Unavailable` (no signer configured):**

```json
{
  "error": {
    "code": "WRITE_SERVICE_DISABLED",
    "message": "Write service is not configured"
  }
}
```

**Contract errors mapped to HTTP:**

| Contract error | HTTP status |
| --- | --- |
| `InvalidDocumentHash` | 400 |
| `CertificateAlreadyExists` | 409 (via error handler) |
| `AccessControlUnauthorizedAccount` | 403 |

---

### 7.8 Revoke certificate

```
POST /api/write/revoke
```

Permanently revokes a certificate on-chain. Only the original issuer or
an administrator can revoke. The backend verifies that the configured
signer matches the original issuer before submitting the transaction.
The normal backend does not expose administrator revocation. The same
`x-api-key`, `Idempotency-Key`, and JSON content-type headers required by
issuance are required here.

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
  "status": "REVOKED",
  "revokedAt": 1721836800,
  "revokedBy": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "replayed": false
}
```

**Contract errors mapped to HTTP:**

| Contract error | HTTP status |
| --- | --- |
| `CertificateNotFound` | 404 |
| `CertificateAlreadyRevoked` | 409 |
| `UnauthorizedRevoker` | 403 |

---

### 7.9 Query raw events

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
  "count": 1
}
```

**Indexed event types:**

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |
| `IssuerAuthorized` | `issuer`, `administrator` | — |
| `IssuerRemoved` | `issuer`, `administrator` | — |

Events are sorted by block number and ethers v6 log index. Queries are
stateless: repeating the same confirmed range returns the same results.
Requested end blocks are clamped to the confirmed head, and ranges larger
than `EVENT_MAX_RANGE` are rejected.

---

### 7.10 Query transformed events

```
GET /api/events/transformed?from=11318772&to=11320000&type=issuance
```

Returns confirmed domain events with normalized names and timestamps for
frontend display. The optional `type` is one of `issuance`, `revocation`,
`authorization`, or `removal`.

```json
{
  "events": [
    {
      "type": "issuance",
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "issuedAt": "1721750400",
      "timestamp": 1721750400,
      "blockNumber": 11318774,
      "transactionHash": "0x...",
      "logIndex": 0
    }
  ],
  "count": 1
}
```

## 8. Error handling

All errors return a stable code and safe message:

```json
{
  "error": {
    "code": "CERTIFICATE_ALREADY_EXISTS",
    "message": "Certificate hash has already been issued"
  }
}
```

### 8.1 HTTP status code mapping

| HTTP status | Meaning | Example triggers |
| --- | --- | --- |
| `400 Bad Request` | Invalid input | Missing or malformed `documentHash` |
| `401 Unauthorized` | Invalid API authentication | Missing or wrong `x-api-key` |
| `403 Forbidden` | Not authorized | Issuer not authorized, not the original issuer |
| `404 Not Found` | Missing resource | Revocation target does not exist |
| `409 Conflict` | State conflict | Duplicate issuance, repeated revocation, reused idempotency key |
| `502 Bad Gateway` | Blockchain transaction failed | On-chain revert, receipt null or failed |
| `503 Service Unavailable` | Service not ready | Event history, index, write authentication, or signer not configured |
| `504 Gateway Timeout` | Transaction state is ambiguous | Confirmation timeout after a transaction hash was obtained |
| `500 Internal Server Error` | Unexpected failure | Unhandled exceptions |

Unexpected provider and implementation errors return `INTERNAL_ERROR`
without including raw RPC messages, credentials, or stack traces.

## 9. Rate limiting

| Scope | Limit | Window | Headers |
| --- | --- | --- | --- |
| Read endpoints (`/api/*`) | 60 requests | 1 minute | `RateLimit-*` standard headers |
| Write endpoints (`/api/write/*`) | 10 requests | 1 minute | `RateLimit-*` standard headers |

Rate limits are applied per IP address. When the limit is exceeded, the
response is `429 Too Many Requests`:

```json
{
  "error": {
    "code": "READ_RATE_LIMIT_EXCEEDED",
    "message": "Too many requests, please try again later"
  }
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

1. Authenticate the API caller and require an idempotency key.
2. Reject unexpected body fields and validate the document hash.
3. Perform status, authorization, and original-issuer preflight reads.
4. Serialize operations for the signer and submit the transaction.
5. Wait for `BLOCKCHAIN_CONFIRMATIONS` blocks (default: 2) for the
   receipt, bounded by `TRANSACTION_WAIT_TIMEOUT_MS`.
6. Verify `receipt.status === 1` (success).
7. Perform a read-only post-check: the record must return the
   expected status (`ACTIVE` after issuance, `REVOKED` after revocation).
8. Store authoritative on-chain timestamps in the in-memory index.
9. Return the transaction hash, block number, document hash, and status.

The backend does **not** mark a write successful merely because a
transaction hash was returned. A receipt with successful status and
post-verification are both required.

### 11.1 Nonce management

The signer uses ethers v6 `NonceManager`, and writes are serialized inside
the process. A definite pre-broadcast submission failure resets the managed
nonce from the network before the next write. A timeout after obtaining a
transaction hash does not reset or automatically reuse that nonce because the
transaction may still be pending. Horizontal scaling still requires one shared
durable queue or a single signing worker.

### 11.2 Idempotency and retry policy

Every write requires `Idempotency-Key`. Matching retries return the saved
result without another transaction. Completed and ambiguous operations are
stored atomically in the gitignored `IDEMPOTENCY_STORE_PATH`, so they survive
a restart of the same service instance. An operation found as `pending` after
a crash is reported as unresolved and must be reconciled against its
transaction hash, signer nonce, events, and contract state. The same key cannot
be reused with a different body. Failed or ambiguous transactions are never
automatically retried. Shared multi-process idempotency still requires the
planned database and queue layer.

For example, if an institution backend times out after requesting issuance, it
must retry with the same key and document hash. It must not use a new key to
bypass an unresolved transaction.

## 12. Event indexing

### 12.1 Indexed events

| Event | Indexed fields | Non-indexed fields |
| --- | --- | --- |
| `CertificateIssued` | `documentHash`, `issuer` | `issuedAt` |
| `CertificateRevoked` | `documentHash`, `issuer`, `revokedBy` | `revokedAt` |
| `IssuerAuthorized` | `issuer`, `administrator` | — |
| `IssuerRemoved` | `issuer`, `administrator` | — |

### 12.2 Synchronization

The certificate index is rebuilt in the background from the deployment block,
queried in bounded chunks, and synchronized at `INDEX_POLL_INTERVAL_MS`.
All requested domain event signatures are combined into each RPC log query to
avoid redundant historical scans. Failed synchronizations retry with
exponential backoff capped by `INDEX_MAX_RETRY_INTERVAL_MS`. Confirmed writes
through this process update the index immediately. Event GET requests are
stateless and stable.

### 12.3 Chain reorganization

Events are kept unfinalized until the configured confirmation depth is
reached. The default `BLOCKCHAIN_CONFIRMATIONS=2` means events from the
latest block minus 2 are considered final. The index retains the most
recent processed block hash in memory and rebuilds if that checkpoint
changes.

### 12.4 Querying

Events can be queried through the `/api/events` endpoint with optional
`from` and `to` block range parameters. The default range starts from the
deployment block (`11318772`). The upper bound is clamped to the confirmed
head, and ranges larger than `EVENT_MAX_RANGE` are rejected.

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
implemented in this gateway:

- Production network deployment or mainnet signing;
- persistent database-backed event and certificate storage;
- SIWE, citizen and institution-user sessions, private roles, and
  institution-scoped authorization, which are implemented in `app-backend/`;
- database-backed shared idempotency and a transaction queue for multiple
  processes (the prototype journal supports one process only);
- direct browser-wallet transaction signing, which is implemented in
  `__frontend/` and independently confirmed by `app-backend/`;
- KMS, HSM, Vault, or production key management;
- monitoring, alerting, or structured logging;
- automatic retry or dead-letter queues for failed transactions;
- batch issuance; or
- zero-knowledge proof verification.

These require separate design and explicit authorization.

The gateway intentionally has no wallet-connect authentication endpoint,
login challenge, or user session. See
[`FRONTEND_APPLICATION.md`](FRONTEND_APPLICATION.md) for those implemented
application features.

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
ISSUER_ADDRESS=<hardhat-account-public-address>
ISSUER_PRIVATE_KEY=<hardhat-account-private-key>
WRITE_API_KEY=<long-random-development-value>
CORS_ALLOWED_ORIGINS=http://localhost:5173
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
  -H "x-api-key: $WRITE_API_KEY" \
  -H "Idempotency-Key: synthetic-issue-001" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'

# Revoke a certificate
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -H "x-api-key: $WRITE_API_KEY" \
  -H "Idempotency-Key: synthetic-revoke-001" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'

# Check issuer authorization
curl http://localhost:3000/api/issuer/0x4e02876F9bfd58f9D2D542F9520055BeD3addd28

# Query events
curl http://localhost:3000/api/events?from=11318772
```

### 15.6 Run automated tests

```bash
npm test
```
