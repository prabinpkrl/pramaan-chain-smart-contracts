import { BrowserProvider, Contract, getAddress } from "ethers";
import { config } from "../config";

const ABI = [
  "function issueCertificate(bytes32 documentHash)",
  "function revokeCertificate(bytes32 documentHash)",
];

async function signerFor(expectedAddress) {
  if (!window.ethereum) throw new Error("A compatible browser wallet is required");
  const provider = new BrowserProvider(window.ethereum);
  let network = await provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${config.chainId.toString(16)}` }],
    });
    network = await provider.getNetwork();
  }
  if (Number(network.chainId) !== config.chainId) {
    throw new Error(`Switch the wallet to Sepolia chain ${config.chainId}`);
  }
  const signer = await provider.getSigner();
  const signerAddress = await signer.getAddress();
  if (getAddress(signerAddress) !== getAddress(expectedAddress)) {
    throw new Error("The connected wallet differs from the authenticated wallet");
  }
  return signer;
}

async function send(method, documentHash, expectedAddress) {
  const signer = await signerFor(expectedAddress);
  const contract = new Contract(config.contractAddress, ABI, signer);
  const transaction = await contract[method](documentHash);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error("The blockchain transaction did not succeed");
  }
  return transaction.hash;
}

export const issueOnChain = (documentHash, expectedAddress) =>
  send("issueCertificate", documentHash, expectedAddress);

export const revokeOnChain = (documentHash, expectedAddress) =>
  send("revokeCertificate", documentHash, expectedAddress);
