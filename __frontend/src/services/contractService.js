import { BrowserProvider, Contract, ZeroAddress, getAddress } from "ethers";
import { config } from "../config";
import { getActiveWalletProvider } from "../utils/walletProvider";

const ABI = [
  "function issueCertificate(bytes32 documentHash)",
  "function revokeCertificate(bytes32 documentHash)",
  "function authorizeIssuer(address issuer)",
];

export function validateIssuerAddress(value) {
  let normalized;
  try {
    normalized = getAddress(value);
  } catch {
    throw new Error("Enter a valid Ethereum issuer address");
  }
  if (normalized === ZeroAddress) {
    throw new Error("The zero address cannot be authorized");
  }
  return normalized;
}

async function signerFor(expectedAddress) {
  const walletProvider = getActiveWalletProvider();
  if (!walletProvider) throw new Error("A compatible wallet connection is required");
  const provider = new BrowserProvider(walletProvider);
  let network = await provider.getNetwork();
  if (Number(network.chainId) !== config.chainId) {
    await walletProvider.request({
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

async function send(method, argument, expectedAddress) {
  const signer = await signerFor(expectedAddress);
  const contract = new Contract(config.contractAddress, ABI, signer);
  const transaction = await contract[method](argument);
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

export const authorizeIssuerOnChain = (issuerAddress, expectedAdminAddress) =>
  send(
    "authorizeIssuer",
    validateIssuerAddress(issuerAddress),
    expectedAdminAddress,
  );
