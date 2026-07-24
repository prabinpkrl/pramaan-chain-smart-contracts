# CRYPTOGRAPHY_ENGINE.md

# PramaanChain Cryptography Engine Documentation

## 1. Overview

The Cryptography Engine provides authenticity, integrity and trust for
every credential issued by PramaanChain. It sits between the API Gateway
and the Permissioned Blockchain. During issuance it hashes documents,
signs them using the issuer's private key, validates issuer trust, and
anchors the document hash on-chain. During verification it recomputes
the hash, verifies the issuer's signature, checks the Trust Registry,
validates holder ownership, and confirms the blockchain anchor.

## 2. Scope

Responsibilities include:

-   SHA-256 hashing
-   Digital signature generation
-   Digital signature verification
-   PKI and key lifecycle management
-   Hardware Security Module (HSM) integration
-   Trust Registry
-   Issuance Service
-   Verification Service
-   Holder-binding challenge--response
-   Cryptography REST APIs

## 3. Architecture

``` text
Issuer Portal ----\
Citizen Wallet ----> API Gateway
Verifier App -----/

          |
          v

+------------------------------+
|   Cryptography Engine        |
|------------------------------|
| Issuance Service             |
| Verification Service         |
| Trust Registry               |
| PKI / HSM                    |
| Cryptography Library         |
+------------------------------+
          |
          v
 Permissioned Blockchain
```

## 4. PKI and Key Management

Each authorized institution receives a unique public/private key pair.

Lifecycle:

1.  Generate
2.  Activate
3.  Use
4.  Rotate
5.  Revoke
6.  Archive

Production deployments should protect private keys using an HSM or KMS.
Prototype deployments may use software-backed keys.

## 5. Cryptography Library

Components:

-   SHA-256 hashing
-   ECDSA signing
-   Signature verification
-   Secure nonce generation
-   Hash validation
-   Public key validation

## 6. Trust Registry

Maps:

-   Institution
-   Issuer ID
-   Public Key
-   Certificate Status
-   Key Version

Only trusted issuers may issue credentials.

## 7. Issuance Service

Workflow:

1.  Receive document.
2.  Compute SHA-256 hash.
3.  Sign hash.
4.  Validate issuer.
5.  Anchor hash on blockchain.
6.  Return signed credential.

## 8. Verification Service

Workflow:

1.  Receive document.
2.  Compute SHA-256 hash.
3.  Verify issuer signature.
4.  Lookup Trust Registry.
5.  Verify blockchain anchor.
6.  Return VERIFIED or INVALID.

## 9. Holder Binding

The verifier generates a random nonce.

The wallet signs the nonce using the holder's private key.

The Verification Service validates the signature against the holder's
public key embedded in the credential.

This prevents replay attacks and proves ownership.

## 10. REST APIs

POST /crypto/hash

POST /crypto/sign

POST /crypto/verify

POST /crypto/challenge

POST /crypto/proof

GET /crypto/trust/{issuer}

GET /crypto/public-key/{issuer}

## 11. Security Requirements

-   Private keys never leave HSM.
-   Documents remain off-chain.
-   Only SHA-256 hashes are anchored.
-   All signatures use approved cryptographic algorithms.
-   Trust Registry maintains issuer authenticity.
-   Nonces expire after a configurable duration.

## 12. Error Handling

-   InvalidHash
-   InvalidSignature
-   UnauthorizedIssuer
-   PublicKeyNotFound
-   KeyRevoked
-   NonceExpired
-   ChallengeMismatch

## 13. Known Limitations

Prototype limitations:

-   Software-backed keys
-   No production HSM
-   No OCSP
-   No Certificate Transparency
-   No threshold signatures

## 14. Future Work

-   AWS KMS integration
-   Azure Key Vault integration
-   Hardware Security Modules
-   Automated key rotation
-   Multi-signature approval
-   Zero-knowledge proof verification
