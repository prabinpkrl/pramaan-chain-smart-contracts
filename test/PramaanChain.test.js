import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.create();

function syntheticDocumentHash(label) {
  return ethers.sha256(ethers.toUtf8Bytes(label));
}

function parameterNames(parameters) {
  return parameters.flatMap((parameter) => [
    parameter.name,
    ...parameterNames(parameter.components ?? []),
  ]);
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

  describe("certificate lookup and verification", function () {
    it("returns the complete active record with its transaction block timestamp", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-5-certificate-1");
      await contract.authorizeIssuer(issuerAddress);
      const transaction = await contract
        .connect(issuer)
        .issueCertificate(documentHash);
      const receipt = await transaction.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const certificate = await contract.getCertificate(documentHash);

      expect(certificate.issuer).to.equal(issuerAddress);
      expect(certificate.issuedAt).to.equal(BigInt(block.timestamp));
      expect(certificate.revokedAt).to.equal(0n);
      expect(certificate.status).to.equal(1n);
    });

    it("returns ACTIVE to any account for an issued hash", async function () {
      const { contract, issuer, issuerAddress, otherAccount } =
        await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-5-certificate-2");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      expect(
        await contract.connect(otherAccount).verifyCertificate(documentHash),
      ).to.equal(1n);
    });

    it("returns a default record and NOT_FOUND for an unknown hash", async function () {
      const { contract } = await deployPramaanChain();
      const unknownHash = syntheticDocumentHash("stage-5-unknown-certificate");

      const certificate = await contract.getCertificate(unknownHash);

      expect(certificate.issuer).to.equal(ethers.ZeroAddress);
      expect(certificate.issuedAt).to.equal(0n);
      expect(certificate.revokedAt).to.equal(0n);
      expect(certificate.status).to.equal(0n);
      expect(await contract.verifyCertificate(unknownHash)).to.equal(0n);
    });

    it("returns a default record and NOT_FOUND for the zero hash", async function () {
      const { contract } = await deployPramaanChain();

      const certificate = await contract.getCertificate(ethers.ZeroHash);

      expect(certificate.issuer).to.equal(ethers.ZeroAddress);
      expect(certificate.issuedAt).to.equal(0n);
      expect(certificate.revokedAt).to.equal(0n);
      expect(certificate.status).to.equal(0n);
      expect(await contract.verifyCertificate(ethers.ZeroHash)).to.equal(0n);
    });

    it("supports verification through a provider-only contract", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-5-certificate-3");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);
      const readOnlyContract = new ethers.Contract(
        await contract.getAddress(),
        contract.interface,
        ethers.provider,
      );

      expect(await readOnlyContract.verifyCertificate(documentHash)).to.equal(
        1n,
      );
      expect((await readOnlyContract.getCertificate(documentHash)).issuer).to.equal(
        issuerAddress,
      );
    });

    it("keeps an issued certificate active after its issuer is removed", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-5-certificate-4");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      await contract.removeIssuer(issuerAddress);

      const certificate = await contract.getCertificate(documentHash);
      expect(certificate.issuer).to.equal(issuerAddress);
      expect(certificate.status).to.equal(1n);
      expect(await contract.verifyCertificate(documentHash)).to.equal(1n);
    });

    it("declares both public read functions as view", async function () {
      const { contract } = await deployPramaanChain();

      expect(
        contract.interface.getFunction("getCertificate").stateMutability,
      ).to.equal("view");
      expect(
        contract.interface.getFunction("verifyCertificate").stateMutability,
      ).to.equal("view");
    });
  });

  describe("certificate revocation", function () {
    it("allows the original issuer to revoke permanently with the block timestamp", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-1");
      await contract.authorizeIssuer(issuerAddress);
      const issuance = await contract
        .connect(issuer)
        .issueCertificate(documentHash);
      const issuanceReceipt = await issuance.wait();
      const issuanceBlock = await ethers.provider.getBlock(
        issuanceReceipt.blockNumber,
      );

      const revocation = await contract
        .connect(issuer)
        .revokeCertificate(documentHash);
      const revocationReceipt = await revocation.wait();
      const revocationBlock = await ethers.provider.getBlock(
        revocationReceipt.blockNumber,
      );

      await expect(revocation)
        .to.emit(contract, "CertificateRevoked")
        .withArgs(
          documentHash,
          issuerAddress,
          issuerAddress,
          BigInt(revocationBlock.timestamp),
        );
      const certificate = await contract.getCertificate(documentHash);
      expect(certificate.issuer).to.equal(issuerAddress);
      expect(certificate.issuedAt).to.equal(BigInt(issuanceBlock.timestamp));
      expect(certificate.revokedAt).to.equal(
        BigInt(revocationBlock.timestamp),
      );
      expect(certificate.status).to.equal(2n);
      expect(await contract.verifyCertificate(documentHash)).to.equal(2n);
    });

    it("allows the administrator to revoke any certificate", async function () {
      const { contract, administratorAddress, issuer, issuerAddress } =
        await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-2");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      const revocation = await contract.revokeCertificate(documentHash);
      const receipt = await revocation.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(revocation)
        .to.emit(contract, "CertificateRevoked")
        .withArgs(
          documentHash,
          issuerAddress,
          administratorAddress,
          BigInt(block.timestamp),
        );
      expect(await contract.verifyCertificate(documentHash)).to.equal(2n);
    });

    it("rejects an unrelated authorized issuer", async function () {
      const {
        contract,
        issuer,
        issuerAddress,
        otherAccount,
        otherAccountAddress,
      } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-3");
      await contract.authorizeIssuer(issuerAddress);
      await contract.authorizeIssuer(otherAccountAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      await expect(
        contract.connect(otherAccount).revokeCertificate(documentHash),
      )
        .to.be.revertedWithCustomError(contract, "UnauthorizedRevoker")
        .withArgs(otherAccountAddress, documentHash);
      expect(await contract.verifyCertificate(documentHash)).to.equal(1n);
    });

    it("rejects a public account", async function () {
      const {
        contract,
        issuer,
        issuerAddress,
        otherAccount,
        otherAccountAddress,
      } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-4");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);

      await expect(
        contract.connect(otherAccount).revokeCertificate(documentHash),
      )
        .to.be.revertedWithCustomError(contract, "UnauthorizedRevoker")
        .withArgs(otherAccountAddress, documentHash);
    });

    it("rejects an unknown hash before checking caller authorization", async function () {
      const { contract, otherAccount } = await deployPramaanChain();
      const unknownHash = syntheticDocumentHash("stage-6-unknown-certificate");

      await expect(
        contract.connect(otherAccount).revokeCertificate(unknownHash),
      )
        .to.be.revertedWithCustomError(contract, "CertificateNotFound")
        .withArgs(unknownHash);
    });

    it("rejects the zero hash as a missing certificate", async function () {
      const { contract } = await deployPramaanChain();

      await expect(contract.revokeCertificate(ethers.ZeroHash))
        .to.be.revertedWithCustomError(contract, "CertificateNotFound")
        .withArgs(ethers.ZeroHash);
    });

    it("rejects repeated revocation and preserves the original timestamp", async function () {
      const { contract, issuer, issuerAddress, otherAccount } =
        await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-5");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);
      await contract.connect(issuer).revokeCertificate(documentHash);
      const originalRecord = await contract.getCertificate(documentHash);

      await expect(
        contract.connect(otherAccount).revokeCertificate(documentHash),
      )
        .to.be.revertedWithCustomError(contract, "CertificateAlreadyRevoked")
        .withArgs(documentHash);
      const unchangedRecord = await contract.getCertificate(documentHash);
      expect(unchangedRecord.revokedAt).to.equal(originalRecord.revokedAt);
      expect(unchangedRecord.status).to.equal(2n);
    });

    it("allows a removed original issuer to revoke its earlier certificate", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-6");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);
      await contract.removeIssuer(issuerAddress);

      await contract.connect(issuer).revokeCertificate(documentHash);

      expect(await contract.isAuthorizedIssuer(issuerAddress)).to.equal(false);
      expect(await contract.verifyCertificate(documentHash)).to.equal(2n);
    });

    it("keeps a revoked hash permanently reserved against reissuance", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-6-certificate-7");
      await contract.authorizeIssuer(issuerAddress);
      await contract.connect(issuer).issueCertificate(documentHash);
      await contract.connect(issuer).revokeCertificate(documentHash);

      await expect(contract.connect(issuer).issueCertificate(documentHash))
        .to.be.revertedWithCustomError(contract, "CertificateAlreadyExists")
        .withArgs(documentHash);
      expect(await contract.verifyCertificate(documentHash)).to.equal(2n);
    });
  });

  describe("interface, immutability, and privacy", function () {
    it("uses the documented NOT_FOUND, ACTIVE, and REVOKED status ordering", async function () {
      const { contract, issuer, issuerAddress } = await deployPramaanChain();
      const documentHash = syntheticDocumentHash("stage-7-certificate-1");
      const unknownHash = syntheticDocumentHash("stage-7-unknown-certificate");
      await contract.authorizeIssuer(issuerAddress);

      expect(await contract.verifyCertificate(unknownHash)).to.equal(0n);

      await contract.connect(issuer).issueCertificate(documentHash);
      expect(await contract.verifyCertificate(documentHash)).to.equal(1n);

      await contract.connect(issuer).revokeCertificate(documentHash);
      expect(await contract.verifyCertificate(documentHash)).to.equal(2n);
    });

    it("exposes only the approved fields in the certificate record", async function () {
      const { contract } = await deployPramaanChain();
      const getCertificate = contract.interface.getFunction("getCertificate");
      const record = getCertificate.outputs[0];

      expect(record.baseType).to.equal("tuple");
      expect(
        record.components.map((component) => [
          component.name,
          component.type,
        ]),
      ).to.deep.equal([
        ["issuer", "address"],
        ["issuedAt", "uint64"],
        ["revokedAt", "uint64"],
        ["status", "uint8"],
      ]);
    });

    it("defines the required domain event fields and indexing", async function () {
      const { contract } = await deployPramaanChain();
      const expectedEvents = {
        IssuerAuthorized: [
          ["issuer", "address", true],
          ["administrator", "address", true],
        ],
        IssuerRemoved: [
          ["issuer", "address", true],
          ["administrator", "address", true],
        ],
        CertificateIssued: [
          ["documentHash", "bytes32", true],
          ["issuer", "address", true],
          ["issuedAt", "uint64", false],
        ],
        CertificateRevoked: [
          ["documentHash", "bytes32", true],
          ["issuer", "address", true],
          ["revokedBy", "address", true],
          ["revokedAt", "uint64", false],
        ],
      };

      for (const [eventName, expectedInputs] of Object.entries(
        expectedEvents,
      )) {
        const event = contract.interface.getEvent(eventName);
        const actualInputs = event.inputs.map((input) => [
          input.name,
          input.type,
          input.indexed,
        ]);

        expect(actualInputs).to.deep.equal(expectedInputs);
      }
    });

    it("contains no personal-data or certificate-editing surface in the ABI", async function () {
      const { contract } = await deployPramaanChain();
      const interfaceNames = contract.interface.fragments
        .flatMap((fragment) => [
          fragment.name,
          ...parameterNames(fragment.inputs ?? []),
          ...parameterNames(fragment.outputs ?? []),
        ])
        .join(" ")
        .toLowerCase();
      const forbiddenPersonalDataTerms = [
        "citizen",
        "citizenship",
        "birth",
        "phone",
        "email",
        "homeaddress",
        "certificatefile",
        "marks",
        "contents",
        "revocationreason",
      ];
      const forbiddenMutationFunctions = [
        "updateCertificate",
        "editCertificate",
        "deleteCertificate",
        "reactivateCertificate",
        "restoreCertificate",
        "unrevokeCertificate",
      ];
      const functionNames = contract.interface.fragments
        .filter((fragment) => fragment.type === "function")
        .map((fragment) => fragment.name);

      for (const forbiddenTerm of forbiddenPersonalDataTerms) {
        expect(interfaceNames).not.to.include(forbiddenTerm);
      }
      for (const forbiddenFunction of forbiddenMutationFunctions) {
        expect(functionNames).not.to.include(forbiddenFunction);
      }
    });
  });
});
