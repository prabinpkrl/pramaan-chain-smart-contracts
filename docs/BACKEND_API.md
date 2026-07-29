# PramaanChain Backend API

This reference lists every implemented HTTP GET and POST endpoint in the
blockchain gateway and private application backend.

## Base URLs

| Service | Local base URL | Authentication |
| --- | --- | --- |
| Blockchain gateway | `http://localhost:3000/api` | Public GET routes; optional write routes use an API key |
| Application backend | `http://localhost:4000/api` | Public health and SIWE start; all other private routes use an HttpOnly session |

All request and response bodies use JSON unless the successful status is
`204 No Content`.

## Authentication conventions

### Application session

1. Request a SIWE message from `POST /api/auth/nonce`.
2. Sign the exact message with the selected wallet.
3. Send it to `POST /api/auth/verify`.
4. Retain the returned `pc_session` HttpOnly cookie.
5. Send the current `x-csrf-token` on protected POST requests.

The backend derives `ADMIN`, `ISSUER`, `CITIZEN`, or `UNLINKED`; a request body
cannot select its own role. `GET /api/auth/session` returns current
authorization and rotates the CSRF token.

### Optional gateway writes

Gateway write requests require:

```http
x-api-key: <configured WRITE_API_KEY>
Idempotency-Key: <unique logical operation key>
Content-Type: application/json
```

The normal Docker application leaves gateway writes disabled and uses browser
wallets for contract transactions.

## Blockchain gateway API

### Endpoint summary

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | RPC, block, signer, and index health |
| GET | `/api/verify/:documentHash` | Public | Read `NOT_FOUND`, `ACTIVE`, or `REVOKED` |
| GET | `/api/certificates/:documentHash` | Public | Read one full contract certificate record |
| GET | `/api/issuer/:address` | Public | Check current issuer authorization |
| GET | `/api/certificates` | Public | Query the indexed certificate list |
| GET | `/api/certificates/summary` | Public | Read indexed active/revoked totals |
| GET | `/api/events` | Public | Read raw contract events |
| GET | `/api/events/transformed` | Public | Read normalized audit events |
| POST | `/api/write/issue` | API key + idempotency | Issue through the configured server signer |
| POST | `/api/write/revoke` | API key + idempotency | Revoke through the configured server signer |

### `GET /api/health`

Returns `200` when the Sepolia RPC is reachable:

```json
{
  "status": "ok",
  "chainId": "11155111",
  "blockNumber": 12345678,
  "issuerAddress": null,
  "certificateIndex": {
    "ready": true,
    "degraded": false,
    "size": 10,
    "lastProcessedBlock": 12345670,
    "consecutiveFailures": 0,
    "lastFailure": null,
    "nextRetryAt": "2026-07-29T10:00:00.000Z"
  },
  "timestamp": "2026-07-29T09:59:30.000Z"
}
```

Returns `503 BLOCKCHAIN_UNAVAILABLE` when the RPC cannot be queried.

### `GET /api/verify/:documentHash`

`documentHash` must be `0x` followed by exactly 64 hexadecimal characters.

```json
{
  "documentHash": "0x...",
  "status": "ACTIVE",
  "issuer": "0x...",
  "issuedAt": 1780000000,
  "revokedAt": 0
}
```

This is a direct contract read and does not require the event index.

### `GET /api/certificates/:documentHash`

Accepts the same hash and returns the same record fields as verification. This
endpoint reads the complete stored contract record directly.

### `GET /api/issuer/:address`

`address` must be a valid Ethereum address. The response identifies the
normalized address and whether it currently holds the issuer role:

```json
{
  "address": "0x...",
  "authorized": true
}
```

### `GET /api/certificates`

Optional query parameters:

| Parameter | Allowed value | Default |
| --- | --- | --- |
| `status` | `ACTIVE` or `REVOKED` | all |
| `issuer` | Ethereum address | all |
| `page` | integer from `1` | `1` |
| `limit` | integer from `1` to `100` | `20` |

Example:

```http
GET /api/certificates?status=ACTIVE&page=1&limit=20
```

The response contains newest-issued certificates first:

```json
{
  "certificates": [
    {
      "documentHash": "0x...",
      "status": "ACTIVE",
      "issuer": "0x...",
      "issuedAt": 1780000000,
      "revokedAt": 0,
      "issueTxHash": "0x...",
      "issueBlockNumber": 12345678,
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
  "index": {}
}
```

Returns `503 CERTIFICATE_INDEX_NOT_READY` when no usable historical index
exists.

### `GET /api/certificates/summary`

Returns indexed totals plus index readiness:

```json
{
  "total": 10,
  "active": 8,
  "revoked": 2,
  "indexSize": 10,
  "index": {}
}
```

### `GET /api/events`

Optional `from` and `to` query parameters accept block numbers. When omitted,
the service applies its configured bounded event range.

```json
{
  "events": [
    {
      "eventName": "CertificateIssued",
      "args": {},
      "blockNumber": 12345678,
      "transactionHash": "0x...",
      "logIndex": 0
    }
  ],
  "count": 1
}
```

This endpoint exposes decoded contract event names and arguments.

### `GET /api/events/transformed`

Optional query parameters:

| Parameter | Allowed value |
| --- | --- |
| `from` | block number |
| `to` | block number |
| `type` | `issuance`, `revocation`, `authorization`, or `removal` |

The response normalizes the four contract events for the frontend audit log:

```json
{
  "events": [
    {
      "type": "issuance",
      "documentHash": "0x...",
      "issuer": "0x...",
      "timestamp": 1780000000,
      "blockNumber": 12345678,
      "transactionHash": "0x...",
      "logIndex": 0
    }
  ],
  "count": 1
}
```

These events come from Sepolia contract logs, not from the private SQLite
database.

### `POST /api/write/issue`

Requires an enabled and currently authorized configured issuer signer.

```json
{
  "documentHash": "0x..."
}
```

Only `documentHash` is accepted. A new operation returns `201`; an idempotent
replay returns `200`.

```json
{
  "transactionHash": "0x...",
  "blockNumber": 12345678,
  "documentHash": "0x...",
  "status": "ACTIVE",
  "issuer": "0x...",
  "issuedAt": 1780000000,
  "replayed": false
}
```

### `POST /api/write/revoke`

Accepts the same body and requires the configured signer to be the original
certificate issuer. Success returns `200` with the confirmed transaction and
revoked record fields. Reusing the same idempotency key for the same logical
operation returns the stored response with `"replayed": true`.

## Application backend API

### Endpoint summary

| Method | Path | Required authorization | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Application and blockchain readiness |
| POST | `/api/auth/nonce` | Public | Create a one-time SIWE challenge |
| POST | `/api/auth/verify` | Public | Verify signature and create session |
| GET | `/api/auth/session` | Session | Refresh authorization and CSRF token |
| POST | `/api/auth/logout` | Session + CSRF | Revoke the current session |
| GET | `/api/admin/institutions` | `ADMIN` | List registered institutions |
| POST | `/api/admin/institutions` | `ADMIN` + CSRF | Register an authorized issuer institution |
| POST | `/api/citizen/institutions/connect` | Session + CSRF | Connect wallet to an institution public ID |
| GET | `/api/citizen/institutions` | `CITIZEN` | List connected institutions |
| POST | `/api/citizen/requests` | `CITIZEN` + CSRF | Create a certificate request |
| GET | `/api/citizen/requests` | `CITIZEN` | List the citizen's requests |
| GET | `/api/citizen/certificates` | `CITIZEN` | List privately assigned certificates |
| GET | `/api/issuer/requests` | `ISSUER` | List requests for one issuer institution |
| POST | `/api/issuer/requests/:id/reject` | `ISSUER` + CSRF | Reject a pending request |
| POST | `/api/issuer/requests/:id/prepare-issuance` | `ISSUER` + CSRF | Reserve the request and hash |
| POST | `/api/issuer/requests/:id/confirm-issuance` | `ISSUER` + CSRF | Validate receipt and finalize issuance |
| GET | `/api/issuer/certificates` | `ISSUER` | List institution certificates |
| POST | `/api/issuer/certificates/:id/prepare-revocation` | `ISSUER` + CSRF | Create a revocation attempt |
| POST | `/api/issuer/certificates/:id/confirm-revocation` | `ISSUER` + CSRF | Validate receipt and finalize revocation |

### Health and authentication

#### `GET /api/health`

Returns `200` with application status, current blockchain readiness, and an ISO
timestamp. This route is public.

#### `POST /api/auth/nonce`

Request:

```json
{
  "address": "0x..."
}
```

Returns `201`:

```json
{
  "message": "localhost wants you to sign in with your Ethereum account: ...",
  "expiresAt": "2026-07-29T10:05:00.000Z"
}
```

Signing this EIP-4361 message is gas-free.

#### `POST /api/auth/verify`

Request:

```json
{
  "message": "the exact message returned by /auth/nonce",
  "signature": "0x..."
}
```

Returns `200`, sets the `pc_session` HttpOnly cookie, and returns:

```json
{
  "address": "0x...",
  "roles": ["ISSUER"],
  "issuerMemberships": [
    {
      "id": "institution-uuid",
      "publicId": "EXAMPLE-UNIVERSITY",
      "name": "Example University"
    }
  ],
  "citizenRelationships": [],
  "csrfToken": "one-time-current-token",
  "expiresAt": "2026-07-30T10:00:00.000Z"
}
```

#### `GET /api/auth/session`

Requires the session cookie. Returns the same authorization shape with a
rotated `csrfToken`.

#### `POST /api/auth/logout`

Requires the session cookie and `x-csrf-token`. Revokes the session, clears the
cookie, and returns `204`.

### Administrator institutions

#### `GET /api/admin/institutions`

Returns:

```json
{
  "institutions": [
    {
      "id": "institution-uuid",
      "publicId": "EXAMPLE-UNIVERSITY",
      "name": "Example University",
      "issuerAddress": "0x...",
      "active": true,
      "authorized": true
    }
  ]
}
```

`authorized` is refreshed from the contract.

#### `POST /api/admin/institutions`

The issuer must already be authorized on-chain by the administrator wallet.

```json
{
  "publicId": "EXAMPLE-UNIVERSITY",
  "name": "Example University",
  "issuerAddress": "0x..."
}
```

`publicId` is normalized to uppercase and must contain letters, numbers, and
single hyphens between segments. Returns `201` with the created institution.

### Citizen workflows

#### `POST /api/citizen/institutions/connect`

Available to any authenticated session, including `UNLINKED`.

```json
{
  "publicId": "EXAMPLE-UNIVERSITY"
}
```

Returns `201` for a new relationship or `200` when already connected. The
response contains the institution, connection result, and refreshed
authorization.

#### `GET /api/citizen/institutions`

Returns `{ "institutions": [...] }` containing the authenticated citizen's
active private relationships.

#### `POST /api/citizen/requests`

```json
{
  "institutionId": "institution-uuid",
  "certificateType": "Synthetic completion certificate"
}
```

Returns `201` with a `PENDING` request. `certificateType` is encrypted at
rest.

#### `GET /api/citizen/requests`

Returns `{ "requests": [...] }`, newest first. Request records include:

- `id`
- `institutionId` and `institutionName`
- `certificateType`
- `status`
- `documentHash`
- `transactionHash`
- `attemptId`
- `createdAt` and `updatedAt`

#### `GET /api/citizen/certificates`

Returns `{ "certificates": [...] }` for certificates privately assigned to
the authenticated citizen. No certificate file is returned or stored.

### Issuer workflows

All issuer list routes require:

```http
?institutionId=<institution-uuid>
```

The authenticated wallet must be a private member of that institution and
currently hold the on-chain issuer role.

#### `GET /api/issuer/requests`

Returns `{ "requests": [...] }`, newest first, for the selected institution.

#### `POST /api/issuer/requests/:id/reject`

```json
{
  "institutionId": "institution-uuid"
}
```

Rejects an eligible request and returns `204`.

#### `POST /api/issuer/requests/:id/prepare-issuance`

```json
{
  "institutionId": "institution-uuid",
  "documentHash": "0x..."
}
```

The hash must currently be `NOT_FOUND` on-chain. A new reservation returns
`201`; resuming the same frozen attempt returns `200`:

```json
{
  "requestId": "request-uuid",
  "attemptId": "attempt-uuid",
  "documentHash": "0x...",
  "status": "PROCESSING",
  "resumed": false
}
```

#### `POST /api/issuer/requests/:id/confirm-issuance`

Call after the browser wallet transaction is mined:

```json
{
  "institutionId": "institution-uuid",
  "attemptId": "attempt-uuid",
  "transactionHash": "0x..."
}
```

The backend validates the receipt status, contract address, sender, event,
document hash, and final `ACTIVE` state. Success returns `200` with the
confirmed private certificate.

#### `GET /api/issuer/certificates`

Returns `{ "certificates": [...] }`, newest first, for the selected
institution.

#### `POST /api/issuer/certificates/:id/prepare-revocation`

```json
{
  "institutionId": "institution-uuid"
}
```

The certificate must be `ACTIVE`, and its original on-chain issuer must be the
authenticated wallet. Returns:

```json
{
  "attemptId": "attempt-uuid",
  "documentHash": "0x...",
  "status": "ACTIVE"
}
```

#### `POST /api/issuer/certificates/:id/confirm-revocation`

```json
{
  "institutionId": "institution-uuid",
  "attemptId": "attempt-uuid",
  "transactionHash": "0x..."
}
```

The backend validates the confirmed revocation transaction and event before
marking the private record `REVOKED`.

## Error format

Both services return safe JSON errors:

```json
{
  "error": {
    "code": "INVALID_DOCUMENT_HASH",
    "message": "documentHash must be 0x followed by 64 hexadecimal characters"
  }
}
```

Clients should branch on `error.code`, display the safe `message`, and never
assume a failed or timed-out write was not broadcast. When a response includes
a transaction hash, inspect or reconcile that transaction before retrying.
