import { useEffect, useState } from "react";

function legacyWalletName(provider) {
  if (provider?.isRabby) return "Rabby Wallet";
  if (provider?.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider?.isBraveWallet) return "Brave Wallet";
  if (provider?.isFrame) return "Frame";
  if (provider?.isMetaMask) return "MetaMask";
  return "Browser wallet";
}

function legacyProviders() {
  if (typeof window === "undefined" || !window.ethereum) return [];
  const providers = Array.isArray(window.ethereum.providers)
    ? window.ethereum.providers
    : [window.ethereum];

  return providers
    .filter((provider) => typeof provider?.request === "function")
    .map((provider, index) => ({
      info: {
        uuid: `legacy-${index}-${legacyWalletName(provider).toLowerCase().replaceAll(" ", "-")}`,
        name: legacyWalletName(provider),
        icon: "",
        rdns: "",
      },
      provider,
    }));
}

function validAnnouncement(detail) {
  return Boolean(
    detail?.info?.uuid
    && detail?.info?.name
    && typeof detail?.provider?.request === "function",
  );
}

export function useInjectedWallets() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    const addWallet = (detail) => {
      if (!validAnnouncement(detail)) return;
      setWallets((current) => {
        if (current.some((wallet) => (
          wallet.provider === detail.provider
          || wallet.info.uuid === detail.info.uuid
        ))) {
          return current;
        }
        return [...current, detail].sort((left, right) => (
          left.info.name.localeCompare(right.info.name)
        ));
      });
    };

    const handleAnnouncement = (event) => addWallet(event.detail);
    window.addEventListener("eip6963:announceProvider", handleAnnouncement);
    legacyProviders().forEach(addWallet);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleAnnouncement);
    };
  }, []);

  return wallets;
}
