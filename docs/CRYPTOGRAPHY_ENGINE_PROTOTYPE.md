# PramaanChain Cryptography Engine (Prototype)

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
- Private keys remain server-side.
- Write operations require an authorized issuer.

## 8. Deferred Features
- HSM
- Cloud KMS
- PKI
- Holder binding
- Zero-knowledge proofs

## 9. Future Enhancements
Production deployments should replace environment-based signing with HSM/KMS and implement PKI, holder binding, and advanced cryptographic services.
