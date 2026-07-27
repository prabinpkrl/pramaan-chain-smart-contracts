/**
 * Thin wrapper around the injected MetaMask provider (window.ethereum).
 * Kept dependency-free on purpose: the frontend only ever needs an address
 * and a chain id, never a signer, so pulling in ethers/wagmi here would be
 * unnecessary weight for a login screen.
 */

export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error("METAMASK_NOT_INSTALLED");
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("NO_ACCOUNTS_RETURNED");
  }

  const chainId = await window.ethereum.request({ method: "eth_chainId" });

  return { address: accounts[0], chainId };
}

export async function getConnectedAccounts() {
  if (!isMetaMaskInstalled()) return [];

  try {
    return await window.ethereum.request({ method: "eth_accounts" });
  } catch {
    return [];
  }
}

export async function requestNetworkSwitch() {
  if (!isMetaMaskInstalled()) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    // 4902: chain not added to MetaMask yet — non-fatal, surfaced to caller
    if (error.code !== 4902) {
      throw error;
    }
  }
}

export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
