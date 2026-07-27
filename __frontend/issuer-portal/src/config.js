const integer = (value, fallback) => {
  const parsed = Number(value ?? fallback);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("VITE_CHAIN_ID must be a positive integer");
  }
  return parsed;
};

export const config = Object.freeze({
  appApiUrl: import.meta.env.VITE_APP_API_URL || "http://localhost:4000/api",
  blockchainApiUrl:
    import.meta.env.VITE_BLOCKCHAIN_API_URL || "http://localhost:3000/api",
  chainId: integer(import.meta.env.VITE_CHAIN_ID, 11155111),
  contractAddress:
    import.meta.env.VITE_CONTRACT_ADDRESS
    || "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
  etherscanBaseUrl:
    import.meta.env.VITE_ETHERSCAN_BASE_URL || "https://sepolia.etherscan.io",
  publicAppUrl:
    import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin,
});
