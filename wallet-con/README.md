# Web3 Wallet Connection

This project is a small React + Vite application that lets users connect a crypto wallet and view basic wallet information from the Ethereum network. It uses modern web3 tools such as wagmi, ConnectKit, Viem, React Query, and Material UI.

## What this app does

When the app loads, it:

- starts a React frontend inside Vite
- connects the app to Ethereum and Sepolia through wagmi
- provides a wallet connection UI using ConnectKit
- shows the user’s connected wallet address, current network, and wallet balance once connected

In simple terms, this is a demo wallet connection app that shows how a frontend can talk to browser wallets like MetaMask, WalletConnect, and other supported providers.

## Main features

- Connect/disconnect wallet through ConnectKit
- Support for Ethereum Mainnet and Sepolia Testnet
- Display connected wallet address in a shortened format
- Show the current blockchain network name
- Display the wallet balance for the connected account
- Modern UI built with Material UI

## How the code works

### 1. App entry point

The file [src/main.tsx](src/main.tsx) is the starting point of the app.

It:

- mounts the React app into the DOM
- wraps the app with the web3 provider and the theme provider
- renders the main UI component

### 2. Web3 provider setup

The file [src/components/Web3Provider.tsx](src/components/Web3Provider.tsx) sets up the blockchain connection layer.

It:

- creates a wagmi config
- defines the supported chains: Ethereum Mainnet and Sepolia
- uses Alchemy RPC endpoints for blockchain communication
- initializes React Query for async data handling
- wraps the app in ConnectKit so wallet connection UI works properly

This is the part that makes the app “web3-aware.” Without it, the wallet connection buttons and blockchain hooks would not work.

### 3. Main app UI

The file [src/App.tsx](src/App.tsx) contains the visible UI.

It uses wagmi hooks such as:

- useAccount() to check whether a wallet is connected and get the wallet address
- useChainId() to detect the current blockchain network
- useBalance() to fetch the wallet balance for the connected address

It then renders:

- a wallet connection button
- connection status information
- the wallet address
- the network name
- the balance if available

### 4. Theme setup

The file [src/components/ThemeRegistry.tsx](src/components/ThemeRegistry.tsx) applies the custom Material UI theme so the app has a consistent visual style.

## Project structure

- [src/App.tsx](src/App.tsx) — main UI and wallet data display
- [src/components/Web3Provider.tsx](src/components/Web3Provider.tsx) — web3 provider, wallet config, and ConnectKit setup
- [src/components/ThemeRegistry.tsx](src/components/ThemeRegistry.tsx) — theme configuration
- [src/main.tsx](src/main.tsx) — app bootstrap
- [public/](public/) — static assets
- [package.json](package.json) — project dependencies and scripts

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

If you do not already have an environment example file, create a file named `.env.local` and add:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_ALCHEMY_ID=your_alchemy_api_key
```

3. Run the app:

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Environment variables

| Variable                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Your WalletConnect Cloud project ID          |
| `VITE_ALCHEMY_ID`               | Your Alchemy API key for Ethereum RPC access |

You can get these from:

- [WalletConnect Cloud](https://cloud.walletconnect.com)
- [Alchemy](https://www.alchemy.com)

## Available scripts

- `npm run dev` — starts the development server
- `npm run build` — runs TypeScript checks and builds the app for production
- `npm run preview` — previews the production build locally
- `npm run lint` — runs ESLint over the project

## Notes

This app is mainly for learning and demonstration purposes. It shows the basic flow of connecting a wallet to a frontend and reading account-related information from the blockchain.

check check
