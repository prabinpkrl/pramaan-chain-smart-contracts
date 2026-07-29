# PramaanChain Backend Sample Requests and Responses (Archived)

These examples describe the current Sepolia prototype API. Replace sample
hashes and secrets with synthetic development values. Never put a private key,
RPC credential, certificate content, or personal information in a request.

The public read examples may be used by the frontend. Protected
`/api/write/*` examples are server-to-server gateway examples only; the
current React application signs issuer transactions in the injected wallet
and never embeds `WRITE_API_KEY`.

Base URL:

```text
http://localhost:3000/api
```

## Public health and verification

### Health

```bash
curl http://localhost:3000/api/health
```

```json
{
  "status": "ok",
  "chainId": "11155111",
  "blockNumber": 11320000,
  "issuerAddress": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "certificateIndex": {
    "ready": true,
    "degraded": false,
    "size": 1,
    "lastProcessedBlock": 11319998,
    "consecutiveFailures": 0,
    "lastFailure": null,
    "nextRetryAt": "2026-07-25T12:00:15.000Z"
  },
  "timestamp": "2026-07-25T12:00:00.000Z"
}
```

### Verify a certificate hash

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

Unknown hashes return `NOT_FOUND`, not an HTTP error:

```json
{
  "documentHash": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "status": "NOT_FOUND",
  "issuer": "0x0000000000000000000000000000000000000000",
  "issuedAt": 0,
  "revokedAt": 0
}
```

### Check issuer authorization

```bash
curl http://localhost:3000/api/issuer/0x4e02876F9bfd58f9D2D542F9520055BeD3addd28
```

```json
{
  "address": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "authorized": true
}
```

## Authenticated write requests

Every write requires:

- `x-api-key`: the configured `WRITE_API_KEY`;
- `Idempotency-Key`: a unique identifier for this logical operation;
- `Content-Type: application/json`.

Only `documentHash` is accepted in the request body.

### Issue a certificate hash

```bash
curl -X POST http://localhost:3000/api/write/issue \
  -H "Content-Type: application/json" \
  -H "x-api-key: $WRITE_API_KEY" \
  -H "Idempotency-Key: synthetic-issue-001" \
  -d '{"documentHash":"0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

First successful request:

```json
{
  "transactionHash": "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "blockNumber": 11320001,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "ACTIVE",
  "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "issuedAt": 1721750400,
  "replayed": false
}
```

Repeating the same request with the same idempotency key returns the same
result with `"replayed": true` and does not submit another transaction, even
after a restart of the same backend instance. If a crash leaves the operation
unresolved, the same key is blocked until the transaction hash and on-chain
state are reconciled.

### Revoke a certificate hash

```bash
curl -X POST http://localhost:3000/api/write/revoke \
  -H "Content-Type: application/json" \
  -H "x-api-key: $WRITE_API_KEY" \
  -H "Idempotency-Key: synthetic-revoke-001" \
  -d '{"documentHash":"0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81"}'
```

```json
{
  "transactionHash": "0xb2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3",
  "blockNumber": 11320002,
  "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  "status": "REVOKED",
  "revokedAt": 1721836800,
  "revokedBy": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
  "replayed": false
}
```

## Certificate index

```bash
curl "http://localhost:3000/api/certificates?status=ACTIVE&page=1&limit=20"
```

```json
{
  "certificates": [
    {
      "documentHash": "0x039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
      "status": "ACTIVE",
      "issuer": "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28",
      "issuedAt": 1721750400,
      "revokedAt": 0,
      "issueTxHash": "0xa1b2c3...",
      "issueBlockNumber": 11320001,
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
    "degraded": false,
    "size": 1,
    "lastProcessedBlock": 11319998,
    "consecutiveFailures": 0,
    "lastFailure": null,
    "nextRetryAt": "2026-07-25T12:00:15.000Z"
  }
}
```

Summary only:

```bash
curl http://localhost:3000/api/certificates/summary
```

## Confirmed event queries

```bash
curl "http://localhost:3000/api/events?from=11318772&to=11320000"
```

```json
{
  "events": [
    {
      "eventName": "CertificateIssued",
      "blockNumber": 11318774,
      "blockHash": "0xabc123...",
      "transactionHash": "0xdef456...",
      "logIndex": 1,
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

Repeating the same confirmed range returns the same result. Requested `to`
blocks above the confirmed head are clamped, and oversized ranges return
`BLOCK_RANGE_TOO_LARGE`.

Frontend-oriented events:

```bash
curl "http://localhost:3000/api/events/transformed?type=issuance"
```

## Structured errors

Malformed hash:

```json
{
  "error": {
    "code": "INVALID_DOCUMENT_HASH",
    "message": "documentHash must be a 0x-prefixed 32-byte hex string (SHA-256 digest)"
  }
}
```

Missing or wrong API key:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "A valid x-api-key header is required"
  }
}
```

Duplicate issuance:

```json
{
  "error": {
    "code": "CERTIFICATE_ALREADY_EXISTS",
    "message": "Certificate hash has already been issued"
  }
}
```

Unexpected JSON fields:

```json
{
  "error": {
    "code": "UNEXPECTED_REQUEST_FIELDS",
    "message": "Only documentHash is accepted"
  }
}
```

Unexpected internal and provider errors are returned as `INTERNAL_ERROR`
without raw provider messages, stack traces, RPC credentials, or secrets.
