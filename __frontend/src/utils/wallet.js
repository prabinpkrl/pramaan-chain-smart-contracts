import { getActiveWalletProvider } from "./walletProvider";

export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111
const SEPOLIA_CHAIN_NUMBER = 11155111;
const WEI_PER_ETH = 10n ** 18n;

export function hasInjectedWallet() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

// Retained as a compatibility alias for existing imports.
export const isMetaMaskInstalled = hasInjectedWallet;

function requireWallet(provider) {
  const selected = provider || getActiveWalletProvider();
  if (!selected || typeof selected.request !== "function") {
    throw new Error("WALLET_NOT_AVAILABLE");
  }
  return selected;
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

export async function getWalletSnapshot(address, provider) {
  const selected = requireWallet(provider);
  const chainId = await selected.request({ method: "eth_chainId" });
  let balance = null;
  try {
    balance = formatWalletBalance(await selected.request({
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

export async function connectWallet(provider) {
  const selected = requireWallet(provider);
  const accounts = await selected.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("NO_ACCOUNTS_RETURNED");
  }

  return getWalletSnapshot(accounts[0], selected);
}

export async function chooseWalletAccount(provider) {
  const selected = requireWallet(provider);
  try {
    await selected.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch (error) {
    if (error.code !== -32601 && error.code !== 4200) throw error;
  }
  return connectWallet(selected);
}

export async function getConnectedAccounts(provider) {
  const selected = provider || getActiveWalletProvider();
  if (!selected || typeof selected.request !== "function") return [];

  try {
    return await selected.request({ method: "eth_accounts" });
  } catch {
    return [];
  }
}

export async function requestNetworkSwitch(provider) {
  const selected = requireWallet(provider);

  try {
    await selected.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await selected.request({
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

export async function connectMobileWallet(projectId) {
  if (!projectId) {
    throw new Error("WALLETCONNECT_NOT_CONFIGURED");
  }

  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const provider = await EthereumProvider.init({
    projectId,
    chains: [SEPOLIA_CHAIN_NUMBER],
    optionalChains: [SEPOLIA_CHAIN_NUMBER],
    showQrModal: true,
    rpcMap: {
      [SEPOLIA_CHAIN_NUMBER]: "https://rpc.sepolia.org",
    },
    metadata: {
      name: "PramaanChain",
      description: "Ethereum certificate proof verification and workspace access",
      url: window.location.origin,
      icons: [`${window.location.origin}/Logo-icon.png`],
    },
  });

  await provider.connect();
  const accounts = provider.accounts?.length
    ? provider.accounts
    : await provider.request({ method: "eth_accounts" });
  if (!accounts?.[0]) {
    throw new Error("NO_ACCOUNTS_RETURNED");
  }

  return {
    provider,
    wallet: await getWalletSnapshot(accounts[0], provider),
    info: {
      uuid: "walletconnect-mobile",
      name: "Mobile wallet",
      icon: "",
      rdns: "network.walletconnect",
    },
  };
}

export function shortenAddress(address, chars = 4) {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
