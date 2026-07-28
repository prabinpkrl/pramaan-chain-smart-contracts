let activeWalletProvider = null;

export function setActiveWalletProvider(provider) {
  activeWalletProvider = provider || null;
}

export function clearActiveWalletProvider() {
  activeWalletProvider = null;
}

export function getActiveWalletProvider() {
  if (activeWalletProvider) return activeWalletProvider;
  if (typeof window !== "undefined") return window.ethereum || null;
  return null;
}
