# Stage 8 Local Demonstration

Date: 2026-07-21

> Historical local evidence. Values and outputs below are preserved as
> recorded and are not current persistent-chain configuration. See
> [`README.md`](README.md) for the documentation index.

This record documents a local-only PramaanChain deployment and lifecycle
demonstration. The node used Hardhat's temporary development chain and funded
development accounts. No real certificate data, production account, private
key, credential, or public network was used.

## Reproduction

Start the local node in one terminal:

```bash
npm run local:node
```

From a second terminal, either deploy the contract only:

```bash
npm run local:deploy
```

Or run the complete checked demonstration:

```bash
npm run local:demo
```

The complete demonstration deploys a fresh contract, authorizes the second
Hardhat development account as an issuer, hashes a synthetic certificate
label, issues that hash, verifies it as `ACTIVE`, revokes it as the issuer,
and verifies it as `REVOKED`. The script exits with an error if either status
or the stored issuer and revocation data do not match the expected values.

## Deployment-only result

- Network: `localhost`
- Chain ID: `31337`
- Administrator: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Contract: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- Deployment transaction: `0x88943898d95bbfcf4bbba280b6c5d04b6dd2b8e073ec5662fe38ee2933de42e4`
- Deployment block: `1`

## Complete lifecycle result

- Network: `localhost`
- Chain ID: `31337`
- Administrator: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Authorized issuer: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Contract: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- Synthetic document hash: `0x761d0765ea662e233764deee061da702dfcf690f3e768e07bad599dd7b3d3c05`
- Deployment transaction: `0x72d83e2aeae9adcc1108e70cdf6a4f47cf6237d480a336da08a79dd293c11d7f`
- Issuer authorization transaction: `0x2681d2aa25825f91cdbab89647356ecc548ca5b369337145ee7621116735081c`
- Certificate issuance transaction: `0xfa92c66fdead3fa89f103e1037d4b634fb483b616cab4228656f4d7fb9b4bcee`
- Certificate revocation transaction: `0x576a134a84cc0b872035c52d3d488054345cdd11fa081899bb19536af2308242`
- Status after issuance: `ACTIVE`
- Status after revocation: `REVOKED`
- Issued-at timestamp: `1784616966`
- Revoked-at timestamp: `1784616967`

These addresses, hashes, block numbers, and timestamps belong only to the
temporary local chain used for this run. Restarting the node resets its state,
so this record is demonstration evidence rather than a persistent deployment
registry.
