import { network } from "hardhat";

const STATUS = {
  NOT_FOUND: 0n,
  ACTIVE: 1n,
  REVOKED: 2n,
};

const { ethers, networkName } = await network.create();
const [administrator, issuer] = await ethers.getSigners();
const administratorAddress = await administrator.getAddress();
const issuerAddress = await issuer.getAddress();
const chain = await ethers.provider.getNetwork();

const contract = await ethers.deployContract("PramaanChain");
await contract.waitForDeployment();

const deploymentTransaction = contract.deploymentTransaction();
if (deploymentTransaction === null) {
  throw new Error("Deployment transaction was not available");
}
const deploymentReceipt = await deploymentTransaction.wait();
if (deploymentReceipt === null) {
  throw new Error("Deployment transaction was not confirmed");
}

const authorizationTransaction = await contract.authorizeIssuer(issuerAddress);
const authorizationReceipt = await authorizationTransaction.wait();
if (authorizationReceipt === null) {
  throw new Error("Issuer authorization transaction was not confirmed");
}

const documentHash = ethers.sha256(
  ethers.toUtf8Bytes("PramaanChain Stage 8 synthetic certificate"),
);
const issuanceTransaction = await contract
  .connect(issuer)
  .issueCertificate(documentHash);
const issuanceReceipt = await issuanceTransaction.wait();
if (issuanceReceipt === null) {
  throw new Error("Certificate issuance transaction was not confirmed");
}

const activeStatus = await contract.verifyCertificate(documentHash);
const activeRecord = await contract.getCertificate(documentHash);
if (activeStatus !== STATUS.ACTIVE) {
  throw new Error(`Expected ACTIVE status, received ${activeStatus}`);
}
if (activeRecord.issuer.toLowerCase() !== issuerAddress.toLowerCase()) {
  throw new Error("Stored certificate issuer did not match the sample issuer");
}

const revocationTransaction = await contract
  .connect(issuer)
  .revokeCertificate(documentHash);
const revocationReceipt = await revocationTransaction.wait();
if (revocationReceipt === null) {
  throw new Error("Certificate revocation transaction was not confirmed");
}

const revokedStatus = await contract.verifyCertificate(documentHash);
const revokedRecord = await contract.getCertificate(documentHash);
if (revokedStatus !== STATUS.REVOKED) {
  throw new Error(`Expected REVOKED status, received ${revokedStatus}`);
}
if (revokedRecord.revokedAt === 0n) {
  throw new Error("Revocation timestamp was not stored");
}

console.log(
  JSON.stringify(
    {
      network: networkName,
      chainId: chain.chainId.toString(),
      administrator: administratorAddress,
      issuer: issuerAddress,
      contractAddress: await contract.getAddress(),
      sampleDocumentHash: documentHash,
      transactions: {
        deployment: deploymentReceipt.hash,
        issuerAuthorization: authorizationReceipt.hash,
        certificateIssuance: issuanceReceipt.hash,
        certificateRevocation: revocationReceipt.hash,
      },
      statusAfterIssuance: "ACTIVE",
      statusAfterRevocation: "REVOKED",
      issuedAt: activeRecord.issuedAt.toString(),
      revokedAt: revokedRecord.revokedAt.toString(),
    },
    null,
    2,
  ),
);
