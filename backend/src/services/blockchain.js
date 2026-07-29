import {
  Contract,
  FetchRequest,
  JsonRpcProvider,
  NonceManager,
  Wallet,
  getAddress,
} from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { getBlockchainConfig } from "../config.js";
import {
  forbidden,
  serviceUnavailable,
} from "../utils/httpError.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATUS_NAMES = ["NOT_FOUND", "ACTIVE", "REVOKED"];

let provider = null;
let readContract = null;
let writeContract = null;
let writeSigner = null;
let issuerAddress = null;
let issuerAuthorized = false;

export function loadAbi() {
  const abiPath = path.join(__dirname, "..", "abi.json");
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

export async function initBlockchain() {
  const config = getBlockchainConfig();

  provider = null;
  readContract = null;
  writeContract = null;
  writeSigner = null;
  issuerAddress = null;
  issuerAuthorized = false;

  const abi = loadAbi();

  const rpcRequest = new FetchRequest(config.rpcUrl);
  rpcRequest.timeout = config.rpcRequestTimeoutMs;
  provider = new JsonRpcProvider(rpcRequest, undefined, {
    batchMaxCount: 1,
  });

  const network = await provider.getNetwork();
  if (network.chainId !== config.chainId) {
    throw new Error(
      `Chain ID mismatch: expected ${config.chainId}, got ${network.chainId}`,
    );
  }

  const code = await provider.getCode(config.contractAddress);
  if (code === "0x") {
    throw new Error(
      `No bytecode at ${config.contractAddress} — contract not deployed`,
    );
  }

  readContract = new Contract(config.contractAddress, abi, provider);

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
    const wallet = new Wallet(privateKey, provider);
    issuerAddress = await wallet.getAddress();

    const expectedIssuer = process.env.ISSUER_ADDRESS;
    if (!expectedIssuer) {
      throw new Error(
        "ISSUER_ADDRESS is required when ISSUER_PRIVATE_KEY is configured",
      );
    }

    let normalizedExpectedIssuer;
    try {
      normalizedExpectedIssuer = getAddress(expectedIssuer);
    } catch {
      throw new Error("ISSUER_ADDRESS must be a valid Ethereum address");
    }

    if (issuerAddress !== normalizedExpectedIssuer) {
      throw new Error(
        "Configured private key does not match the expected ISSUER_ADDRESS",
      );
    }

    writeSigner = new NonceManager(wallet);
    writeContract = readContract.connect(writeSigner);
    issuerAuthorized = await readContract.isAuthorizedIssuer(issuerAddress);
    if (!issuerAuthorized) {
      console.warn(
        `Issuer ${issuerAddress} is not currently authorized; issuance is disabled`,
      );
    }

    const balance = await provider.getBalance(issuerAddress);
    if (balance === 0n) {
      console.warn(
        `Warning: issuer ${issuerAddress} has zero Sepolia ETH balance`,
      );
    }
  } else {
    issuerAddress = null;
    issuerAuthorized = false;
    writeContract = null;
    console.warn(
      "No ISSUER_PRIVATE_KEY configured — write operations disabled",
    );
  }

  return {
    readContract,
    writeContract,
    provider,
    issuerAddress,
    issuerAuthorized,
    contractAddress: config.contractAddress,
    chainId: network.chainId,
  };
}

export function getReadContract() {
  if (!readContract) throw new Error("Blockchain not initialized");
  return readContract;
}

export function getWriteContract() {
  if (!writeContract) {
    throw serviceUnavailable(
      "WRITE_SERVICE_DISABLED",
      "Write service is not configured",
    );
  }
  return writeContract;
}

export function getProvider() {
  if (!provider) throw new Error("Blockchain not initialized");
  return provider;
}

export function getIssuerAddress() {
  return issuerAddress;
}

export function resetWriteNonce() {
  writeSigner?.reset();
}

export async function requireAuthorizedIssuer() {
  if (!issuerAddress || !readContract) {
    throw serviceUnavailable(
      "WRITE_SERVICE_DISABLED",
      "Write service is not configured",
    );
  }

  issuerAuthorized = await readContract.isAuthorizedIssuer(issuerAddress);
  if (!issuerAuthorized) {
    throw forbidden(
      "ISSUER_NOT_AUTHORIZED",
      "Configured issuer is not currently authorized",
    );
  }
}

export function isIssuerAuthorized() {
  return issuerAuthorized;
}

export function statusToName(value) {
  const name = STATUS_NAMES[Number(value)];
  if (name === undefined) {
    throw new Error(`Unexpected certificate status: ${value}`);
  }
  return name;
}
