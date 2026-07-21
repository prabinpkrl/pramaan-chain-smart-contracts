import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

function syntheticDocumentHash(label) {
  return ethers.sha256(ethers.toUtf8Bytes(label));
}

async function deployPramaanChain() {
  const [administrator, issuer, otherAccount] = await ethers.getSigners();
  const contract = await ethers.deployContract("PramaanChain");

  await contract.waitForDeployment();

  return {
    contract,
    administrator,
    issuer,
    otherAccount,
    administratorAddress: await administrator.getAddress(),
    issuerAddress: await issuer.getAddress(),
    otherAccountAddress: await otherAccount.getAddress(),
  };
}

describe("PramaanChain", function () {
  describe("deployment", function () {
    it("assigns only ADMIN_ROLE to the deployer", async function () {
      const { contract, administratorAddress, otherAccountAddress } =
        await deployPramaanChain();
      const adminRole = await contract.ADMIN_ROLE();
      const issuerRole = await contract.ISSUER_ROLE();
      const defaultAdminRole = await contract.DEFAULT_ADMIN_ROLE();

      expect(adminRole).to.equal(ethers.id("ADMIN_ROLE"));
      expect(issuerRole).to.equal(ethers.id("ISSUER_ROLE"));
      expect(await contract.hasRole(adminRole, administratorAddress)).to.equal(
        true,
      );
      expect(
        await contract.hasRole(defaultAdminRole, administratorAddress),
      ).to.equal(false);
      expect(await contract.hasRole(issuerRole, administratorAddress)).to.equal(
        false,
      );
      expect(await contract.hasRole(adminRole, otherAccountAddress)).to.equal(
        false,
      );
    });

    it("reports ADMIN_ROLE as the issuer role administrator", async function () {
      const { contract } = await deployPramaanChain();

      expect(await contract.getRoleAdmin(await contract.ISSUER_ROLE())).to.equal(
        await contract.ADMIN_ROLE(),
      );
    });
  });

  describe("issuer authorization", function () {
    it("allows the administrator to authorize an issuer and emits events", async function () {
      const { contract, administratorAddress, issuerAddress } =
        await deployPramaanChain();
      const issuerRole = await contract.ISSUER_ROLE();
      const transaction = await contract.authorizeIssuer(issuerAddress);

      await expect(transaction)
        .to.emit(contract, "IssuerAuthorized")
        .withArgs(issuerAddress, administratorAddress);
      await expect(transaction)
        .to.emit(contract, "RoleGranted")
        .withArgs(issuerRole, issuerAddress, administratorAddress);
      expect(await contract.isAuthorizedIssuer(issuerAddress)).to.equal(true);
    });

    it("allows the administrator to authorize its own address as an issuer", async function () {
      const { contract, administratorAddress } = await deployPramaanChain();

      await contract.authorizeIssuer(administratorAddress);

      expect(await contract.isAuthorizedIssuer(administratorAddress)).to.equal(
        true,
      );
    });

    it("rejects authorization by a non-administrator", async function () {
      const { contract, issuerAddress, otherAccount, otherAccountAddress } =
        await deployPramaanChain();

      await expect(
        contract.connect(otherAccount).authorizeIssuer(issuerAddress),
      )
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(otherAccountAddress, await contract.ADMIN_ROLE());
    });

    it("rejects the zero address", async function () {
      const { contract } = await deployPramaanChain();

      await expect(contract.authorizeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(contract, "InvalidIssuerAddress");
    });

    it("rejects an already-authorized issuer", async function () {
      const { contract, issuerAddress } = await deployPramaanChain();
      await contract.authorizeIssuer(issuerAddress);

      await expect(contract.authorizeIssuer(issuerAddress))
        .to.be.revertedWithCustomError(contract, "IssuerAlreadyAuthorized")
        .withArgs(issuerAddress);
    });

    it("returns false when checking the zero address", async function () {
      const { contract } = await deployPramaanChain();

      expect(await contract.isAuthorizedIssuer(ethers.ZeroAddress)).to.equal(
        false,
      );
    });
  });

  describe("issuer removal", function () {
    it("allows the administrator to remove an issuer and emits events", async function () {
      const { contract, administratorAddress, issuerAddress } =
        await deployPramaanChain();
      const issuerRole = await contract.ISSUER_ROLE();
      await contract.authorizeIssuer(issuerAddress);
      const transaction = await contract.removeIssuer(issuerAddress);

      await expect(transaction)
        .to.emit(contract, "IssuerRemoved")
        .withArgs(issuerAddress, administratorAddress);
      await expect(transaction)
        .to.emit(contract, "RoleRevoked")
        .withArgs(issuerRole, issuerAddress, administratorAddress);
      expect(await contract.isAuthorizedIssuer(issuerAddress)).to.equal(false);
    });

    it("rejects removal by a non-administrator", async function () {
      const {
        contract,
        issuer,
        issuerAddress,
        otherAccountAddress,
      } = await deployPramaanChain();
      await contract.authorizeIssuer(otherAccountAddress);

      await expect(contract.connect(issuer).removeIssuer(otherAccountAddress))
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(issuerAddress, await contract.ADMIN_ROLE());
    });

    it("rejects the zero address", async function () {
      const { contract } = await deployPramaanChain();

      await expect(contract.removeIssuer(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(contract, "InvalidIssuerAddress");
    });

    it("rejects an address that is not an authorized issuer", async function () {
      const { contract, issuerAddress } = await deployPramaanChain();

      await expect(contract.removeIssuer(issuerAddress))
        .to.be.revertedWithCustomError(contract, "IssuerNotAuthorized")
        .withArgs(issuerAddress);
    });

    it("allows a removed issuer to be authorized again", async function () {
      const { contract, issuerAddress } = await deployPramaanChain();
      await contract.authorizeIssuer(issuerAddress);
      await contract.removeIssuer(issuerAddress);

      await contract.authorizeIssuer(issuerAddress);

      expect(await contract.isAuthorizedIssuer(issuerAddress)).to.equal(true);
    });
  });

  describe("role mutation boundary", function () {
    it("rejects inherited direct role-management functions", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const issuerRole = await contract.ISSUER_ROLE();
      await contract.authorizeIssuer(issuerAddress);

      await expect(contract.grantRole(issuerRole, issuerAddress))
        .to.be.revertedWithCustomError(
          contract,
          "DirectRoleManagementDisabled",
        );
      await expect(contract.revokeRole(issuerRole, issuerAddress))
        .to.be.revertedWithCustomError(
          contract,
          "DirectRoleManagementDisabled",
        );
      await expect(
        contract.connect(issuer).renounceRole(issuerRole, issuerAddress),
      ).to.be.revertedWithCustomError(
        contract,
        "DirectRoleManagementDisabled",
      );
      expect(await contract.isAuthorizedIssuer(issuerAddress)).to.equal(true);
    });
  });

  describe("certificate issuance", function () {
    it("allows an authorized issuer to issue a hash with the block timestamp", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-4-certificate-1");
      await contract.authorizeIssuer(issuerAddress);

      const transaction = await contract
        .connect(issuer)
        .issueCertificate(documentHash);
      const receipt = await transaction.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(transaction)
        .to.emit(contract, "CertificateIssued")
        .withArgs(documentHash, issuerAddress, BigInt(block.timestamp));
    });

    it("allows an authorized issuer to issue different hashes", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const firstHash = syntheticDocumentHash("stage-4-certificate-2");
      const secondHash = syntheticDocumentHash("stage-4-certificate-3");
      await contract.authorizeIssuer(issuerAddress);

      await contract.connect(issuer).issueCertificate(firstHash);
      await contract.connect(issuer).issueCertificate(secondHash);
    });

    it("rejects a public account that is not an authorized issuer", async function () {
      const { contract, otherAccount, otherAccountAddress } =
        await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-4-certificate-4");

      await expect(
        contract.connect(otherAccount).issueCertificate(documentHash),
      )
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(otherAccountAddress, await contract.ISSUER_ROLE());
    });

    it("does not let the administrator issue without issuer authorization", async function () {
      const { contract, administratorAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-4-certificate-5");

      await expect(contract.issueCertificate(documentHash))
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(administratorAddress, await contract.ISSUER_ROLE());
    });

    it("rejects a removed issuer", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-4-certificate-6");
      await contract.authorizeIssuer(issuerAddress);
      await contract.removeIssuer(issuerAddress);

      await expect(contract.connect(issuer).issueCertificate(documentHash))
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(issuerAddress, await contract.ISSUER_ROLE());
    });

    it("rejects the zero document hash from an authorized issuer", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      await contract.authorizeIssuer(issuerAddress);

      await expect(
        contract.connect(issuer).issueCertificate(ethers.ZeroHash),
      ).to.be.revertedWithCustomError(contract, "InvalidDocumentHash");
    });

    it("checks issuer authorization before validating the document hash", async function () {
      const { contract, otherAccount, otherAccountAddress } =
        await deployPramaanChain();

      await expect(
        contract.connect(otherAccount).issueCertificate(ethers.ZeroHash),
      )
        .to.be.revertedWithCustomError(
          contract,
          "AccessControlUnauthorizedAccount",
        )
        .withArgs(otherAccountAddress, await contract.ISSUER_ROLE());
    });

    it("rejects a duplicate hash globally across authorized issuers", async function () {
      const {
        contract,
        issuer,
        issuerAddress,
        otherAccount,
        otherAccountAddress,
      } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-4-certificate-7");
      await contract.authorizeIssuer(issuerAddress);
      await contract.authorizeIssuer(otherAccountAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      await expect(
        contract.connect(otherAccount).issueCertificate(documentHash),
      )
        .to.be.revertedWithCustomError(contract, "CertificateAlreadyExists")
        .withArgs(documentHash);
    });
  });
});
