import fs from "node:fs";
import path from "node:path";
import { Contract, keccak256 } from "ethers";

export function loadPramaanArtifact() {
  const artifactPath = path.resolve(
    "artifacts/contracts/PramaanChain.sol/PramaanChain.json",
  );
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

async function findCreationReceipt(provider, metadata) {
  const deploymentBlock = await provider.getBlock(
    metadata.deploymentBlockNumber,
    true,
  );
  if (deploymentBlock === null) {
    throw new Error("Recorded deployment block was not found");
  }

  const creationTransactions = deploymentBlock.prefetchedTransactions.filter(
    (transaction) => transaction.to === null,
  );
  const creationReceipts = await Promise.all(
    creationTransactions.map((transaction) => provider.getTransactionReceipt(
      transaction.hash,
    )),
  );
  return creationReceipts.find(
    (receipt) => receipt?.contractAddress?.toLowerCase()
      === metadata.contractAddress.toLowerCase(),
  );
}

export async function validateExactDeployment({
  provider,
  metadata,
  deploymentTransactionHash,
}) {
  const artifact = loadPramaanArtifact();
  const code = await provider.getCode(metadata.contractAddress);
  if (code === "0x") throw new Error("No deployed bytecode was found");
  if (
    !artifact.deployedBytecode
    || code.toLowerCase() !== artifact.deployedBytecode.toLowerCase()
  ) {
    throw new Error("Deployed bytecode does not match this PramaanChain build");
  }

  const deploymentReceipt = deploymentTransactionHash
    ? await provider.getTransactionReceipt(deploymentTransactionHash)
    : await findCreationReceipt(provider, metadata);

  if (
    !deploymentReceipt
    || deploymentReceipt.status !== 1
    || deploymentReceipt.blockNumber !== metadata.deploymentBlockNumber
    || deploymentReceipt.contractAddress?.toLowerCase()
      !== metadata.contractAddress.toLowerCase()
  ) {
    throw new Error(
      "Deployment receipt does not prove this contract address and deployment block",
    );
  }

  const contract = new Contract(metadata.contractAddress, artifact.abi, provider);
  const adminRole = await contract.ADMIN_ROLE();
  if (!await contract.hasRole(adminRole, metadata.administrator)) {
    throw new Error("Recorded administrator does not hold ADMIN_ROLE");
  }

  return {
    artifact,
    contract,
    deploymentReceipt,
    deployedBytecodeHash: keccak256(code),
  };
}
