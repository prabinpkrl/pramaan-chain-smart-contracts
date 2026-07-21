# Sepolia Deployment Report

## Deployment identity

- Date: 2026-07-21
- Network: Ethereum Sepolia (public testnet)
- Chain ID: `11155111`
- Reviewed commit: `73a711d0694197e70e2c262fffd587183c7414fa`
- Contract: `PramaanChain`
- Solidity compiler: `0.8.28`
- Hardhat build profile: `production`
- Contract address: [`0x0bb21729BBDaBe54A289A1e924941F8F635Cab84`](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84)
- Source verification: [Verified on Etherscan](https://sepolia.etherscan.io/address/0x0bb21729BBDaBe54A289A1e924941F8F635Cab84#code)

All addresses, hashes, blocks, and balances in this report are public Sepolia
testnet data. No RPC credential, API key, private key, seed phrase, keystore
content, personal information, or real certificate data is recorded.

## Test-only actors

| Role | Public Sepolia address |
| --- | --- |
| Administrator and deployer | `0x3537d004295AF62098e63DCF6bB8A7c6dAaCB447` |
| Synthetic sample issuer | `0x4e02876F9bfd58f9D2D542F9520055BeD3addd28` |

The administrator and issuer were distinct, dedicated test-only wallets. The
deployer nonce and issuer nonce were both `0`, with no pending transactions,
immediately before the deployment lifecycle began.

## Preflight and authorization evidence

- The configured RPC reported chain ID `11155111`.
- The configured signer keys derived to the two expected public addresses.
- The administrator held `0.05` Sepolia ETH and the issuer held `0.217`
  Sepolia ETH before submission.
- All 45 automated tests passed on the reviewed commit before submission.
- The production-profile deployment estimate was `1,331,999` gas.
- At deployment block `11318772`, runtime bytecode was present, the deployer
  held `ADMIN_ROLE`, the deployer did not hold `ISSUER_ROLE`, and the sample
  issuer did not yet hold `ISSUER_ROLE`.
- After the authorization transaction, the sample issuer held `ISSUER_ROLE`.

## Synthetic certificate evidence

The demonstration hashed this fixed synthetic label:

```text
PramaanChain Stage 11 Sepolia synthetic certificate
```

Its SHA-256 `bytes32` value was:

```text
0x6a1c557dab491820c0c90770d46d60f06c809a76cd0b1afa9691be0397d4ab6d
```

No document or personal information was used. After issuance, read-only calls
returned the expected issuer and `ACTIVE`. After revocation by the original
issuer, read-only calls returned `REVOKED`, status value `2`, with issuance
timestamp `1784625444` and revocation timestamp `1784625456`. Revocation is
permanent under the reviewed contract.

## Confirmed transactions

| Operation | Transaction | Block | UTC timestamp | Status | Gas used |
| --- | --- | ---: | --- | ---: | ---: |
| Deploy `PramaanChain` | [`0x9b20876ed80e1b9680f9d1a0aed0f2fa8d65b4549fa2692828f8a276f60d8483`](https://sepolia.etherscan.io/tx/0x9b20876ed80e1b9680f9d1a0aed0f2fa8d65b4549fa2692828f8a276f60d8483) | `11318772` | `2026-07-21T09:17:00Z` | `1` | `736226` |
| Authorize issuer | [`0xa4bde159a7ff6ca203088dbeee08ad5c379cef2b631c01112f1b251420a532d8`](https://sepolia.etherscan.io/tx/0xa4bde159a7ff6ca203088dbeee08ad5c379cef2b631c01112f1b251420a532d8) | `11318773` | `2026-07-21T09:17:12Z` | `1` | `50744` |
| Issue synthetic hash | [`0x7de96f6f3ee975b6406a5b31a92fcb9f7bbad7586c4ee412180c2071ea37f931`](https://sepolia.etherscan.io/tx/0x7de96f6f3ee975b6406a5b31a92fcb9f7bbad7586c4ee412180c2071ea37f931) | `11318774` | `2026-07-21T09:17:24Z` | `1` | `71206` |
| Revoke synthetic hash | [`0xdc5159f65c3c6e48fc4ac2ae48c29c9e2c56b3877218f6b50dd7bd80834d61ba`](https://sepolia.etherscan.io/tx/0xdc5159f65c3c6e48fc4ac2ae48c29c9e2c56b3877218f6b50dd7bd80834d61ba) | `11318775` | `2026-07-21T09:17:36Z` | `1` | `31826` |

All four receipts had success status `1`. Their combined actual transaction
cost was approximately `0.001012979647309802` Sepolia ETH.

## Build and source verification

The deployed runtime bytecode was compared byte-for-byte with the local
`PramaanChain` production artifact generated from the reviewed commit. Both
were `2,906` bytes and matched exactly.

The source was submitted with the same production profile used for deployment:

```bash
npm run sepolia:verify -- 0x0bb21729BBDaBe54A289A1e924941F8F635Cab84
```

Hardhat reported successful verification for
`contracts/PramaanChain.sol:PramaanChain`, and Etherscan displays the verified
source at the link above.

## Result

**PASS**

The independently reviewed contract was deployed to Sepolia, its reviewed
runtime bytecode and initial administrator assignment were confirmed, the
complete synthetic authorization, issuance, `ACTIVE` verification, revocation,
and `REVOKED` verification lifecycle succeeded, and the source was verified on
Etherscan. No secret or real certificate data was exposed.
