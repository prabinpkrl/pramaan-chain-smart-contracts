import { ethers } from "ethers";
import * as fs from "fs";

require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const contractAddress = process.env.PRAMAAN_CHAIN_ADDRESS;
const abi = JSON.parse(fs.readFileSync('path_to_abi.json', 'utf8'));
const issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY;
const issuerSigner = new ethers.Wallet(issuerPrivateKey, provider);

async function initialize() {
  // Verify network
  const network = await provider.getNetwork();
  if (network.chainId !== parseInt(process.env.CHAIN_ID)) {
    throw new Error("Incorrect chain ID");
  }

  // Verify contract code
  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error("Contract not deployed at configured address");
  }

  // Load contract
  const contract = new ethers.Contract(contractAddress, abi, provider);

  // Verify issuer address is authorized
  const isAuthorized = await contract.isAuthorizedIssuer(await issuerSigner.getAddress());
  if (!isAuthorized) {
    throw new Error("Issuer is not authorized");
  }

  // Set up write contract
  const writeContract = contract.connect(issuerSigner);

  // Additional checks as needed...

  return { contract, writeContract };
}