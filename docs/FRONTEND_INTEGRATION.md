# PramaanChain Frontend Integration Decisions

## Current implementation boundary

This document defines frontend integration decisions; it does not claim that
all described frontend or citizen authentication features are implemented.

The current backend gateway supports public certificate reads, certificate and
event lists, and protected issuer issue/revoke operations. It validates the
server-side issuer wallet against its configured public address and on-chain
authorization.

The current backend and frontend do **not** yet implement citizen wallet
connection, a backend-generated login nonce, citizen signature verification,
citizen sessions/JWTs, private citizen ownership records, or wallet-based
dashboard authorization.

The future citizen login nonce must not be confused with the Ethereum
transaction nonce managed for the issuer signer. The former proves control of
a citizen wallet during login; the latter orders blockchain transactions.
The HTTP `Idempotency-Key` separately prevents duplicate issue/revoke
submissions.

Frontend code must never receive `WRITE_API_KEY`, `ISSUER_PRIVATE_KEY`, or the
administrator private key. A trusted authenticated application backend must
call the protected issuer-write endpoints.

## 1. Certificates page data source

### Decision: Use `GET /api/certificates` (new endpoint), not `GET /api/events`

### Problem

`GET /api/events` returns raw blockchain log entries. A single certificate
can produce multiple events:

```
CertificateIssued  → documentHash 0xabc..., block 11318774
CertificateRevoked → documentHash 0xabc..., block 11318780
```

The frontend would need to:
1. Filter out non-certificate events (`IssuerAuthorized`, `IssuerRemoved`)
2. Deduplicate by `documentHash`
3. Reconstruct current state (latest event wins)
4. Handle pagination, sorting, and filtering client-side

This pushes state reconstruction logic into the frontend and returns
unnecessary data.

### Recommendation

Add a new `GET /api/certificates` endpoint that returns **current
certificate state** — one row per hash with its final status, built from
an in-memory index.

### New endpoint: `GET /api/certificates`

```
GET /api/certificates?status=ACTIVE&issuer=0x4e02...&page=1&limit=20
```

**Query parameters:**

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `status` | No | all | Filter by `ACTIVE`, `REVOKED`, or `NOT_FOUND` |
| `issuer` | No | all | Filter by issuer address (case-insensitive) |
| `page` | No | `1` | Page number (1-indexed) |
| `limit` | No | `20` | Results per page (max 100) |

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
      "transactionHash": "0xdef456...",
      "blockNumber": 11318774
    }
  ],
  "pagination": {
    "page": 1,
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

### Implementation

The backend builds an in-memory `Map<documentHash, CertificateRecord>` on
startup by fetching all `CertificateIssued` events from the deployment
block. When `CertificateRevoked` events arrive, the index updates the
record status to `REVOKED`.

This avoids N+1 on-chain calls (one `getCertificate()` per hash) while
keeping reads fast.

**Trade-offs:**
- Requires server restart to rebuild the index (acceptable for Sepolia
  prototype)
- No persistence — if the server crashes, it rebuilds on next startup
- Memory grows with certificate count (negligible for prototype scale)

---

## 2. Frontend document hash generation

### Decision: Use SHA-256 on exact raw file bytes

### Rule

The frontend must hash the **exact same bytes** that will be hashed during
verification. The contract only stores the hash — it never sees the
document. If issuance and verification hash different bytes, the hashes
won't match and verification will return `NOT_FOUND`.

### Implementation

**JavaScript (browser or Node.js):**

```js
// Browser (using Web Crypto API)
async function hashDocument(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return "0x" + hashHex;
}

// Node.js (using ethers)
import { readFile } from "node:fs/promises";
import { sha256 } from "ethers";

async function hashDocument(filePath) {
  const bytes = await readFile(filePath);
  return sha256(bytes); // returns "0x" + 64 hex chars
}
```

**Usage in a file upload form:**

```js
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

// Hash the file before sending to the backend
const documentHash = await hashDocument(file);

// Send the hash to the authenticated institution application.
// That trusted server calls the blockchain gateway; WRITE_API_KEY must
// never be placed in browser code.
const response = await fetch("/api/institution/certificate-requests/request-id/issue", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ documentHash }),
});
```

### Validation

The frontend should validate the hash before sending:

```js
function isValidDocumentHash(hash) {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

if (!isValidDocumentHash(documentHash)) {
  throw new Error("Invalid document hash format");
}
```

### What NOT to hash

| Input | Why it's wrong |
| --- | --- |
| File name | Different machines have different paths |
| File path | Platform-specific, not canonical |
| Base64 string | Different encoding than raw bytes |
| JSON.stringify(file) | Includes metadata, not raw content |
| Keccak-256 | Contract expects SHA-256 |
| String content of the file | Different from binary content for binary files |

### Agreement between application components

Both sides must use the same hashing logic:
1. Read the file as raw bytes (not text, not base64)
2. Hash with SHA-256
3. Represent as `0x` + 64 lowercase hex characters
4. Pass that string as `documentHash` in API calls

The current blockchain gateway validates a supplied hash but does not receive
or re-hash the document. The authenticated institution backend must either
hash the exact raw bytes itself or compare the browser-generated digest with
its own digest before calling `/api/write/issue`. The gateway's
`WRITE_API_KEY` is server-side only and must never be exposed to a browser.

---

## 3. Events endpoint display

### Decision: Add `GET /api/events/transformed` for frontend consumption

### Problem

`GET /api/events` returns raw event logs with blockchain-specific fields
(`blockHash`, `logIndex`) and duplicate entries for the same certificate.
A frontend Certificates page needs a clean, deduplicated, sorted list.

### Two endpoints, two purposes

| Endpoint | Purpose | Audience |
| --- | --- | --- |
| `GET /api/events` | Raw blockchain logs, audit trail | Auditors, debug, blockchain explorers |
| `GET /api/events/transformed` | Clean, deduplicated, human-readable | Frontend applications |

### New endpoint: `GET /api/events/transformed`

```
GET /api/events/transformed?from=11318772&to=11320000&type=issuance
```

**Query parameters:**

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `from` | No | deployment block | Start block number |
| `to` | No | latest | End block number |
| `type` | No | all | Filter: `issuance`, `revocation`, `authorization`, `removal` |

**Response `200 OK`:**

```json
{
  "events": [
    {
      "type": "issuance",
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "timestamp": 1721750400,
      "blockNumber": 11318774,
      "transactionHash": "0xdef456..."
    },
    {
      "type": "authorization",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "administrator": "0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447",
      "timestamp": 1721750300,
      "blockNumber": 11318773,
      "transactionHash": "0xabc123..."
    }
  ],
  "count": 2
}
```

### Field mapping

| Raw event | Transformed field |
| --- | --- |
| `CertificateIssued` | `type: "issuance"`, `documentHash`, `issuer`, `timestamp: issuedAt` |
| `CertificateRevoked` | `type: "revocation"`, `documentHash`, `issuer`, `revokedBy`, `timestamp: revokedAt` |
| `IssuerAuthorized` | `type: "authorization"`, `issuer`, `administrator`, `timestamp` (from block) |
| `IssuerRemoved` | `type: "removal"`, `issuer`, `administrator`, `timestamp` (from block) |

### When to use which

| Page | Use |
| --- | --- |
| Certificates table | `GET /api/certificates` (state) |
| Audit log / activity feed | `GET /api/events/transformed` (timeline) |
| Debug / blockchain explorer | `GET /api/events` (raw logs) |
| Certificate detail page | `GET /api/certificates/:documentHash` (single record) |
| Verification (QR scan) | `GET /api/verify/:documentHash` (status check) |
