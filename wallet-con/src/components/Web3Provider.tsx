import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
const alchemyId = import.meta.env.VITE_ALCHEMY_ID;

const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, sepolia],
    transports: {
      [mainnet.id]: http(
        `https://eth-mainnet.g.alchemy.com/v2/${alchemyId}`
      ),
      [sepolia.id]: http(
        `https://eth-sepolia.g.alchemy.com/v2/${alchemyId}`
      ),
    },
    enableFamily: false,
    walletConnectProjectId,
    appName: "Web3 Wallet",
    appDescription: "Connect your wallet and manage assets on Ethereum",
    appUrl: typeof window !== "undefined" ? window.location.origin : "",
    appIcon: "https://family.co/logo.png",
  })
);

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="rounded">{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
