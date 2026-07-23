import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATUS_NAMES = ["NOT_FOUND", "ACTIVE", "REVOKED"];

let provider = null;
let readContract = null;
let writeContract = null;
let issuerAddress = null;

function loadAbi() {
  const abiPath = path.join(__dirname, "abi.json");
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

export async function initBlockchain() {
  const expectedChainId = BigInt(process.env.BLOCKCHAIN_CHAIN_ID || "11155111");
  const contractAddress = getAddress(process.env.PRAMAAN_CHAIN_ADDRESS);
  const rpcUrl = process.env.SEPOLIA_RPC_URL;

  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL is required");
  }

  const abi = loadAbi();

  provider = new JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(
      `Chain ID mismatch: expected ${expectedChainId}, got ${network.chainId}`,
    );
  }

  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error(
      `No bytecode at ${contractAddress} — contract not deployed`,
    );
  }

  readContract = new Contract(contractAddress, abi, provider);

  const requiredFns = [
    "verifyCertificate",
    "getCertificate",
    "isAuthorizedIssuer",
    "issueCertificate",
    "revokeCertificate",
  ];
  for (const fn of requiredFns) {
    if (!readContract.getFunction(fn)) {
      throw new Error(`ABI missing required function: ${fn}`);
    }
  }

  const privateKey = process.env.ISSUER_PRIVATE_KEY;
  if (privateKey) {
    const signer = new Wallet(privateKey, provider);
    issuerAddress = await signer.getAddress();
    writeContract = readContract.connect(signer);

    const authorized = await readContract.isAuthorizedIssuer(issuerAddress);
    if (!authorized) {
      throw new Error(
        `Configured issuer ${issuerAddress} is not authorized on-chain`,
      );
    }

    const balance = await provider.getBalance(issuerAddress);
    if (balance === 0n) {
      console.warn(
        `Warning: issuer ${issuerAddress} has zero Sepolia ETH balance`,
      );
    }
  } else {
    console.warn(
      "No ISSUER_PRIVATE_KEY configured — write operations disabled",
    );
  }

  return {
    readContract,
    writeContract,
    provider,
    issuerAddress,
    contractAddress,
    chainId: network.chainId,
  };
}

export function getReadContract() {
  if (!readContract) throw new Error("Blockchain not initialized");
  return readContract;
}

export function getWriteContract() {
  if (!writeContract) throw new Error("Write service not initialized (no ISSUER_PRIVATE_KEY)");
  return writeContract;
}

export function getProvider() {
  if (!provider) throw new Error("Blockchain not initialized");
  return provider;
}

export function getIssuerAddress() {
  return issuerAddress;
}

export function statusToName(value) {
  const name = STATUS_NAMES[Number(value)];
  if (name === undefined) {
    throw new Error(`Unexpected certificate status: ${value}`);
  }
  return name;
}
