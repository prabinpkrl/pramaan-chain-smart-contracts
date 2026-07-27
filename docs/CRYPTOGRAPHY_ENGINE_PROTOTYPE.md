# PramaanChain Cryptography Engine (Prototype)

> Historical compact overview. The current implementation distributes these
> responsibilities across the browser frontend, private application backend,
> public blockchain gateway, and contract. See
> [`CRYPTOGRAPHY_ENGINE.md`](CRYPTOGRAPHY_ENGINE.md) for the current boundary.

## 1. Overview
This document describes the prototype Cryptography Engine used by PramaanChain on the Ethereum Sepolia network. It performs SHA-256 hashing, document validation, issuance, verification, and blockchain interaction through ethers v6.

## 2. Architecture
```text
Issuer Portal / Verifier App
            |
        API Gateway
            |
    +-------------------------+
    | Cryptography Engine     |
    | SHA-256 Hashing         |
    | Hash Validation         |
    | Issuance Service        |
    | Verification Service    |
    | Blockchain Adapter      |
    | (ethers v6)             |
    +-------------------------+
            |
      Ethereum Sepolia
            |
  PramaanChain Smart Contract
```

## 3. Responsibilities
- SHA-256 hashing
- Hash validation
- Issue certificates
- Verify certificates
- Check authorized issuers
- Confirm transaction receipts

## 4. Issuer Identity
The prototype uses Ethereum addresses as issuer identities.
Configuration:
- ISSUER_PRIVATE_KEY
- SEPOLIA_RPC_URL
Authorization is determined by `isAuthorizedIssuer(address)`.

## 5. Issuance Flow
1. Hash document.
2. Validate hash.
3. Submit issueCertificate().
4. Wait for receipt.
5. Verify ACTIVE status.

## 6. Verification Flow
1. Hash document.
2. verifyCertificate().
3. getCertificate().
4. Return ACTIVE, REVOKED or NOT_FOUND.

## 7. Security
- Documents remain off-chain.
- Only SHA-256 hashes are anchored.
- Wallet private keys remain inside the injected wallet; the optional gateway
  signer remains server-side.
- Write operations require an authorized issuer.

## 8. Deferred Features
- HSM
- Cloud KMS
- PKI
- Holder binding
- Zero-knowledge proofs

## 9. Future Enhancements
Production deployments require a separately approved custody design such as
HSM/KMS, organization-managed multisignature administration, and any approved
PKI or holder-binding model.
