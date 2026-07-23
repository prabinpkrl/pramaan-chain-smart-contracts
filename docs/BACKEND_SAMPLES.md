# PramaanChain Backend — Sample Requests and Responses

All examples assume the server is running at `http://localhost:3000`.

---

## 1. Health Check

### Request

```http
GET /api/health HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/health
```

### Response — 200 OK

```json
{
  "status": "ok",
  "chainId": "11155111",
  "blockNumber": 5800000,
  "issuerAddress": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "timestamp": "2026-07-23T12:00:00.000Z"
}
```

### Response — 503 Service Unavailable

```json
{
  "status": "error",
  "message": "Chain ID mismatch: expected 11155111, got 1"
}
```

---

## 2. Verify Certificate

### Request — valid hash

```http
GET /api/verify/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81 HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/verify/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81
```

### Response — 200 OK (ACTIVE)

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0
}
```

### Response — 200 OK (NOT_FOUND)

```json
{
  "documentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "status": "NOT_FOUND",
  "issuer": "0x0000000000000000000000000000000000000000",
  "issuedAt": 0,
  "revokedAt": 0
}
```

### Response — 200 OK (REVOKED)

```json
{
  "documentHash": "0x7b3a54df88c4e5c450f2f5d2c0e1c98c0a3b2f6e8d4c1a7b9e5d3f2c8a6b4e0d",
  "status": "REVOKED",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 1721836800
}
```

### Response — 400 Bad Request (invalid hash)

```bash
curl http://localhost:3000/api/verify/not-a-hash
```

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

### Response — 400 Bad Request (too short)

```bash
curl http://localhost:3000/api/verify/0xabc123
```

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

### Response — 429 Too Many Requests

```json
{
  "error": "Too many requests, please try again later"
}
```

---

## 3. Get Certificate

### Request

```http
GET /api/certificates/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81 HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/certificates/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81
```

### Response — 200 OK (ACTIVE)

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0
}
```

### Response — 200 OK (NOT_FOUND)

```json
{
  "documentHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "status": "NOT_FOUND",
  "issuer": "0x0000000000000000000000000000000000000000",
  "issuedAt": 0,
  "revokedAt": 0
}
```

### Response — 200 OK (REVOKED)

```json
{
  "documentHash": "0x7b3a54df88c4e5c450f2f5d2c0e1c98c0a3b2f6e8d4c1a7b9e5d3f2c8a6b4e0d",
  "status": "REVOKED",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 1721836800
}
```

### Response — 400 Bad Request

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

---

## 4. Check Issuer Authorization

### Request

```http
GET /api/issuer/0x4e02876F9bfd58f9D2D542F9520055BeD3addd28 HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/issuer/0x4e02876F9bfd58f9D2D542F9520055BeD3addd28
```

### Response — 200 OK (authorized)

```json
{
  "address": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "authorized": true
}
```

### Response — 200 OK (not authorized)

```bash
curl http://localhost:3000/api/issuer/0x0000000000000000000000000000000000000000
```

```json
{
  "address": "0x0000000000000000000000000000000000000000",
  "authorized": false
}
```

### Response — 200 OK (random address)

```bash
curl http://localhost:3000/api/issuer/0x1234567890abcdef1234567890abcdef12345678
```

```json
{
  "address": "0x1234567890abcdef1234567890abcdef12345678",
  "authorized": false
}
```

---

## 5. Issue Certificate

### Request

```http
POST /api/write/issue HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
}
```

```bash
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

### Response — 201 Created

```json
{
  "transactionHash": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "blockNumber": 5800123,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE"
}
```

### Response — 400 Bad Request (missing body)

```bash
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "error": "documentHash is required"
}
```

### Response — 400 Bad Request (invalid hash format)

```bash
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "not-a-hash"}'
```

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

### Response — 403 Forbidden (issuer not authorized)

```json
{
  "error": "not authorized"
}
```

### Response — 409 Conflict (hash already issued)

```json
{
  "error": "CertificateAlreadyExists"
}
```

### Response — 503 Service Unavailable (no signer configured)

```json
{
  "error": "Write service not initialized (no ISSUER_PRIVATE_KEY)"
}
```

### Response — 502 Bad Gateway (on-chain tx failed)

```json
{
  "error": "Blockchain transaction failed: 0xa1b2c3d4..."
}
```

### Response — 429 Too Many Requests

```json
{
  "error": "Too many write requests, please try again later"
}
```

---

## 6. Revoke Certificate

### Request

```http
POST /api/write/revoke HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
}
```

```bash
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

### Response — 200 OK

```json
{
  "transactionHash": "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  "blockNumber": 5800456,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "REVOKED"
}
```

### Response — 400 Bad Request (missing body)

```bash
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{
  "error": "documentHash is required"
}
```

### Response — 400 Bad Request (invalid hash)

```json
{
  "error": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
}
```

### Response — 403 Forbidden (not original issuer)

```json
{
  "error": "not the original certificate issuer"
}
```

### Response — 404 Not Found (hash never issued)

```json
{
  "error": "CertificateNotFound"
}
```

### Response — 409 Conflict (already revoked)

```json
{
  "error": "CertificateAlreadyRevoked"
}
```

### Response — 503 Service Unavailable (no signer)

```json
{
  "error": "Write service not initialized (no ISSUER_PRIVATE_KEY)"
}
```

### Response — 502 Bad Gateway (on-chain tx failed)

```json
{
  "error": "Blockchain transaction failed: 0xb2c3d4e5..."
}
```

### Response — 429 Too Many Requests

```json
{
  "error": "Too many write requests, please try again later"
}
```

---

## 7. Query Events

### Request — default range (deployment block to latest)

```http
GET /api/events HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/events
```

### Request — custom block range

```http
GET /api/events?from=11318772&to=11320000 HTTP/1.1
Host: localhost:3000
```

```bash
curl "http://localhost:3000/api/events?from=11318772&to=11320000"
```

### Response — 200 OK (with events)

```json
{
  "events": [
    {
      "eventName": "IssuerAuthorized",
      "blockNumber": 11318773,
      "blockHash": "0xabc123...",
      "transactionHash": "0xdef456...",
      "logIndex": 0,
      "args": {
        "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
        "administrator": "0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447"
      }
    },
    {
      "eventName": "CertificateIssued",
      "blockNumber": 11318774,
      "blockHash": "0xghi789...",
      "transactionHash": "0xjkl012...",
      "logIndex": 0,
      "args": {
        "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
        "issuedAt": "1721750400"
      }
    },
    {
      "eventName": "CertificateRevoked",
      "blockNumber": 11318780,
      "blockHash": "0xmnq345...",
      "transactionHash": "0xrsu678...",
      "logIndex": 0,
      "args": {
        "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
        "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
        "revokedBy": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
        "revokedAt": "1721836800"
      }
    }
  ],
  "count": 3,
  "totalProcessed": 3
}
```

### Response — 200 OK (no events in range)

```json
{
  "events": [],
  "count": 0,
  "totalProcessed": 0
}
```

---

## 8. List Certificates

### Request — all certificates (default pagination)

```http
GET /api/certificates HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/certificates
```

### Response — 200 OK

```json
{
  "certificates": [
    {
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "status": "ACTIVE",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "issuedAt": 1721750400,
      "revokedAt": 0,
      "issueTxHash": "0xdef456...",
      "issueBlockNumber": 11318774,
      "revokeTxHash": null,
      "revokeBlockNumber": null,
      "revokedBy": null
    },
    {
      "documentHash": "0x7b3a54df88c4e5c450f2f5d2c0e1c98c0a3b2f6e8d4c1a7b9e5d3f2c8a6b4e0d",
      "status": "REVOKED",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "issuedAt": 1721750000,
      "revokedAt": 1721836800,
      "issueTxHash": "0xabc123...",
      "issueBlockNumber": 11318770,
      "revokeTxHash": "0xghi789...",
      "revokeBlockNumber": 11318780,
      "revokedBy": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  },
  "summary": {
    "total": 2,
    "active": 1,
    "revoked": 1
  }
}
```

### Request — filter by ACTIVE status

```bash
curl "http://localhost:3000/api/certificates?status=ACTIVE"
```

### Request — filter by issuer

```bash
curl "http://localhost:3000/api/certificates?issuer=0x4e02876F9bfd58f9D2D542F9520055BeD3addd28"
```

### Request — paginate (page 2, 10 per page)

```bash
curl "http://localhost:3000/api/certificates?page=2&limit=10"
```

### Response — 200 OK (empty page)

```json
{
  "certificates": [],
  "pagination": {
    "page": 5,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  },
  "summary": {
    "total": 45,
    "active": 40,
    "revoked": 5
  }
}
```

### Response — 400 Bad Request (invalid status)

```bash
curl "http://localhost:3000/api/certificates?status=INVALID"
```

```json
{
  "error": "status must be ACTIVE, REVOKED, or NOT_FOUND"
}
```

### Response — 503 Service Unavailable (index building)

```json
{
  "error": "Certificate index not ready"
}
```

---

## 9. Certificate Summary

### Request

```http
GET /api/certificates/summary HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/certificates/summary
```

### Response — 200 OK

```json
{
  "total": 45,
  "active": 40,
  "revoked": 5,
  "indexSize": 45
}
```

---

## 10. Get Single Certificate (from index)

### Request

```http
GET /api/certificates/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81 HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/certificates/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81
```

### Response — 200 OK

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0,
  "issueTxHash": "0xdef456...",
  "issueBlockNumber": 11318774,
  "revokeTxHash": null,
  "revokeBlockNumber": null,
  "revokedBy": null
}
```

### Response — 404 Not Found

```bash
curl http://localhost:3000/api/certificates/0x0000000000000000000000000000000000000000000000000000000000000000
```

```json
{
  "error": "Certificate not found in index"
}
```

---

## 11. Transformed Events

### Request — all events

```http
GET /api/events/transformed HTTP/1.1
Host: localhost:3000
```

```bash
curl http://localhost:3000/api/events/transformed
```

### Response — 200 OK

```json
{
  "events": [
    {
      "type": "authorization",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "administrator": "0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447",
      "timestamp": 1721750300,
      "blockNumber": 11318773,
      "transactionHash": "0xabc123..."
    },
    {
      "type": "issuance",
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "timestamp": 1721750400,
      "blockNumber": 11318774,
      "transactionHash": "0xdef456..."
    },
    {
      "type": "revocation",
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "revokedBy": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "timestamp": 1721836800,
      "blockNumber": 11318780,
      "transactionHash": "0xghi789..."
    }
  ],
  "count": 3
}
```

### Request — filter by type

```bash
curl "http://localhost:3000/api/events/transformed?type=issuance"
```

```bash
curl "http://localhost:3000/api/events/transformed?type=revocation"
```

```bash
curl "http://localhost:3000/api/events/transformed?type=authorization"
```

### Request — filter by block range

```bash
curl "http://localhost:3000/api/events/transformed?from=11318772&to=11318780"
```

### Response — 400 Bad Request (invalid type)

```bash
curl "http://localhost:3000/api/events/transformed?type=invalid"
```

```json
{
  "error": "type must be one of: issuance, revocation, authorization, removal"
}
```

---

## 12. Full Lifecycle Example

This example demonstrates a complete certificate lifecycle: issue, verify
as ACTIVE, revoke, verify as REVOKED.

### Step 1 — Compute SHA-256 hash of a document

```js
import { readFile } from "node:fs/promises";
import { sha256 } from "ethers";

const bytes = await readFile("certificate.pdf");
const hash = sha256(bytes);
// "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"
```

### Step 2 — Issue the certificate

```bash
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

```json
{
  "transactionHash": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "blockNumber": 5800123,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE"
}
```

### Step 3 — Verify it is ACTIVE

```bash
curl http://localhost:3000/api/verify/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81
```

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 0
}
```

### Step 4 — Revoke the certificate

```bash
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -d '{"documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

```json
{
  "transactionHash": "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  "blockNumber": 5800456,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "REVOKED"
}
```

### Step 5 — Verify it is REVOKED

```bash
curl http://localhost:3000/api/verify/0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81
```

```json
{
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "REVOKED",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "revokedAt": 1721836800
}
```

---

## 13. Error Response Summary

All error responses follow this shape:

```json
{
  "error": "Human-readable error message"
}
```

| HTTP Status | `error` value | Trigger |
| --- | --- | --- |
| `400` | `documentHash is required` | POST body missing `documentHash` |
| `400` | `documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)` | Invalid hash format |
| `400` | `status must be ACTIVE, REVOKED, or NOT_FOUND` | Invalid status filter on `/api/certificates` |
| `400` | `type must be one of: issuance, revocation, authorization, removal` | Invalid type filter on `/api/events/transformed` |
| `403` | `not authorized` | Issuer not authorized on-chain |
| `403` | `not the original certificate issuer` | Revocation by non-original issuer |
| `404` | `CertificateNotFound` | Revocation target does not exist |
| `404` | `Certificate not found in index` | Certificate hash not in in-memory index |
| `409` | `CertificateAlreadyExists` | Duplicate issuance attempt |
| `409` | `CertificateAlreadyRevoked` | Double revocation attempt |
| `502` | `Blockchain transaction failed: 0x...` | On-chain receipt status != 1 |
| `502` | `Issuance failed on-chain` | Post-issue verification failed |
| `502` | `Revocation failed on-chain` | Post-revoke verification failed |
| `503` | `Write service not initialized (no ISSUER_PRIVATE_KEY)` | No signer configured |
| `503` | `Blockchain not initialized` | Startup failed |
| `503` | `Certificate index not ready` | Server still building index at startup |
| `429` | `Too many requests, please try again later` | Read rate limit exceeded |
| `429` | `Too many write requests, please try again later` | Write rate limit exceeded |
| `500` | `Internal server error` | Unhandled exception |
