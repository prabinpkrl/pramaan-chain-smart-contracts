import { network } from "hardhat";
import { assertExpectedChainId } from "./network-safety.js";

const { ethers, networkName } = await network.create();
const [administrator] = await ethers.getSigners();
const chain = await ethers.provider.getNetwork();

if (administrator === undefined) {
  throw new Error("An administrator signer is required for deployment");
}
assertExpectedChainId(networkName, chain.chainId);

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

console.log(
  JSON.stringify(
    {
      network: networkName,
      chainId: chain.chainId.toString(),
      administrator: await administrator.getAddress(),
      contractAddress: await contract.getAddress(),
      deploymentTransactionHash: deploymentReceipt.hash,
      deploymentBlockNumber: deploymentReceipt.blockNumber,
    },
    null,
    2,
  ),
);
