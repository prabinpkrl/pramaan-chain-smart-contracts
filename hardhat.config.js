import dotenv from "dotenv";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

dotenv.config({ quiet: true });

const sepoliaBase = {
  type: "http",
  chainType: "l1",
  chainId: 11155111,
  url: configVariable("SEPOLIA_RPC_URL"),
};

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: "0.8.28",
  networks: {
    sepolia: {
      ...sepoliaBase,
      accounts: [],
    },
    "sepolia-admin": {
      ...sepoliaBase,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
    "sepolia-demo": {
      ...sepoliaBase,
      accounts: [
        configVariable("DEPLOYER_PRIVATE_KEY"),
        configVariable("ISSUER_PRIVATE_KEY"),
      ],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
