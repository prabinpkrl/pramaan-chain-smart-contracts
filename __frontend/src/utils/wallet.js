/**
 * Thin wrapper around the injected MetaMask provider (window.ethereum).
 * Kept dependency-free on purpose: the frontend only ever needs an address
 * and a chain id, never a signer, so pulling in ethers/wagmi here would be
 * unnecessary weight for a login screen.
 */

export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const WEI_PER_ETH = 10n ** 18n;

export function isMetaMaskInstalled() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

function requireWallet() {
  if (!isMetaMaskInstalled() || typeof window.ethereum.request !== "function") {
    throw new Error("METAMASK_NOT_INSTALLED");
  }
  return window.ethereum;
}

export function formatWalletBalance(value) {
  const wei = BigInt(value);
  const whole = wei / WEI_PER_ETH;
  const fraction = (wei % WEI_PER_ETH)
    .toString()
    .padStart(18, "0")
    .slice(0, 4)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export async function getWalletSnapshot(address) {
  const provider = requireWallet();
  const chainId = await provider.request({ method: "eth_chainId" });
  let balance = null;
  try {
    balance = formatWalletBalance(await provider.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    }));
  } catch {
    // Balance is presentational only and must never block SIWE authentication.
  }
  return {
    address,
    chainId,
    balance,
  };
}

export async function connectWallet() {
  const provider = requireWallet();
  const accounts = await provider.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("NO_ACCOUNTS_RETURNED");
  }

  return getWalletSnapshot(accounts[0]);
}

export async function chooseWalletAccount() {
  const provider = requireWallet();
  try {
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (error) {
    if (error.code !== -32601 && error.code !== 4200) throw error;
  }
  return connectWallet();
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
  const provider = requireWallet();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: SEPOLIA_CHAIN_ID,
        chainName: "Sepolia",
        nativeCurrency: {
          name: "Sepolia Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: ["https://rpc.sepolia.org"],
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      }],
    });
  }
}

export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
