function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

const runtime = typeof window === "undefined"
  ? {}
  : window.__PRAMAAN_CONFIG__ || {};

function runtimeValue(name, buildValue, fallback) {
  return Object.hasOwn(runtime, name) ? runtime[name] : buildValue || fallback;
}

export const config = Object.freeze({
  appApiUrl: runtimeValue(
    "appApiUrl",
    import.meta.env.VITE_APP_API_URL,
    "http://localhost:4000/api",
  ),
  blockchainApiUrl: runtimeValue(
    "blockchainApiUrl",
    import.meta.env.VITE_BLOCKCHAIN_API_URL,
    "http://localhost:3000/api",
  ),
  chainId: positiveInteger(
    runtimeValue("chainId", import.meta.env.VITE_CHAIN_ID, 11155111),
    11155111,
    "VITE_CHAIN_ID",
  ),
  contractAddress: runtimeValue(
    "contractAddress",
    import.meta.env.VITE_CONTRACT_ADDRESS,
    "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
  ),
  etherscanBaseUrl: runtimeValue(
    "etherscanBaseUrl",
    import.meta.env.VITE_ETHERSCAN_BASE_URL,
    "https://sepolia.etherscan.io",
  ),
  publicAppUrl: runtimeValue(
    "publicAppUrl",
    import.meta.env.VITE_PUBLIC_APP_URL,
    window.location.origin,
  ),
  walletConnectProjectId: runtimeValue(
    "walletConnectProjectId",
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    "",
  ),
});
