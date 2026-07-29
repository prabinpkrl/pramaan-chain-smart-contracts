# PramaanChain Cryptographic and Blockchain Boundary (Archived)

## 1. Current implementation

“Cryptography engine” is a logical boundary in the current prototype, not one
service that receives certificate files and controls every signer. Its
responsibilities are deliberately split:

| Component | Responsibility |
| --- | --- |
| `__frontend/` | Hash exact local file bytes with browser SHA-256; validate direct hash input; request wallet signatures |
| `app-backend/` | Generate and verify SIWE messages; protect private records; validate browser-submitted transaction receipts |
| `backend/` | Validate hashes, perform public contract reads, build the confirmed event index, and optionally support server-side issuer writes |
| `PramaanChain` | Enforce issuer authorization, unique issuance, permanent revocation, and public status |

Raw certificate bytes remain in the user's browser. Neither backend receives
or stores the file. Only a `0x`-prefixed 32-byte SHA-256 digest crosses the
blockchain boundary.

## 2. Network identity

| Item | Value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Contract | `0x0bb21729BBDaBe54A289A1e924941F8F635Cab84` |
| Solidity | `0.8.28` |
| Source | [Verified on Etherscan](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code) |

## 3. Document hashing

The interoperable document identifier is:

```text
0x + lowercase hexadecimal SHA-256(exact raw document bytes)
```

The result is 32 bytes and maps directly to Solidity `bytes32`.

Correct browser implementation:

```js
export async function hashDocument(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return `0x${hex}`;
}
```

A direct verifier may instead supply a previously calculated digest matching:

```js
/^0x[0-9a-fA-F]{64}$/
```

Do not hash a file name, path, Base64 encoding, UI metadata, or
`JSON.stringify(file)`. Do not substitute Ethereum Keccak-256. Issuance and
verification succeed only when they hash identical bytes with the same
algorithm.

The contract validates byte length and rejects the all-zero value for
issuance, but it cannot prove that a supplied `bytes32` was produced by
SHA-256. That is an off-chain interoperability rule.

## 4. Issuance

1. The issuer selects the certificate locally.
2. The browser computes its SHA-256 digest.
3. The private backend atomically reserves the request and exact hash.
4. The injected authorized issuer wallet signs
   `issueCertificate(documentHash)`.
5. The private backend validates the contract, sender, successful receipt,
   `CertificateIssued` event, exact hash, and final `ACTIVE` state.
6. The encrypted database assigns the public proof to the intended citizen.

Contract preconditions:

| Check | Contract error |
| --- | --- |
| Caller has `ISSUER_ROLE` | OpenZeppelin unauthorized-account error |
| Hash is not zero | `InvalidDocumentHash` |
| Hash has never been issued | `CertificateAlreadyExists` |

## 5. Verification

Public verification needs no wallet, signature, or gas:

1. Hash the exact file locally or enter a valid existing digest.
2. Call `verifyCertificate(documentHash)` through
   `GET /api/verify/:documentHash`.
3. Read `getCertificate(documentHash)` when issuer and timestamps are needed.

| ABI value | Status | Meaning |
| ---: | --- | --- |
| `0` | `NOT_FOUND` | The exact hash has never been issued |
| `1` | `ACTIVE` | Issued and not revoked |
| `2` | `REVOKED` | Permanently revoked |

Verification of the public hash does not prove who possesses the original
document or who is entitled to it. Citizen assignment exists only in the
encrypted application database.

## 6. Revocation

The original issuer or contract administrator may revoke a certificate
on-chain. The current issuer portal supports the original-issuer path:

1. Recheck institution membership and current issuer authorization.
2. Require the connected wallet to equal the immutable original issuer.
3. Sign `revokeCertificate(documentHash)` in the injected wallet.
4. Validate the receipt, event, and final `REVOKED` state independently.

Revocation is permanent. A revoked hash cannot be reissued. The current UI
does not expose administrator emergency revocation.

## 7. Signer and secret boundaries

- Browser transactions use an injected wallet. The application never receives
  its private key or seed phrase.
- The gateway can operate read-only with no signer. Its optional server-side
  writes require a separate test-only `ISSUER_PRIVATE_KEY` and
  `WRITE_API_KEY`; the frontend never receives either.
- The administrator private key is never loaded into a backend. Admin
  authorization is signed in the administrator's browser wallet.
- `SEPOLIA_RPC_URL`, private keys, API keys, and the application data
  encryption key must never be committed or placed in `VITE_*` variables.
- Hardhat keystore variables are for approved deployment tooling, not normal
  frontend operation.

## 8. Privacy boundary

| Public on-chain data | Never placed on-chain |
| --- | --- |
| SHA-256 document hash | Certificate file or contents |
| Issuer address | Citizen name or identifier |
| Issuance and revocation timestamps | Contact details, marks, or address |
| `ACTIVE` or `REVOKED` status | Detailed revocation reason |

A document hash is a stable fingerprint, not encryption. Predictable source
documents may be susceptible to guessing, so original files still require
appropriate off-chain protection.

## 9. Deferred production work

The current prototype does not include HSM/KMS signing, production
multisignature administration, issuer PKI, on-chain holder binding, wallet
recovery, production deployment, monitoring, or zero-knowledge proofs. These
require separate design and explicit authorization.

For the contract interface see
[`CONTRACT_DESIGN.md`](CONTRACT_DESIGN.md). For gateway behavior see
[`BACKEND_ARCHITECTURE_AND_API.md`](BACKEND_ARCHITECTURE_AND_API.md). For the
implemented private and browser
flow see [`APPLICATION_GUIDE.md`](APPLICATION_GUIDE.md) and
[`FRONTEND_INTEGRATION.md`](FRONTEND_INTEGRATION.md).
