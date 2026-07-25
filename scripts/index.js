import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet, getAddress } from "ethers";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const abiPath = path.join(
  scriptDirectory,
  "..",
  "artifacts",
  "contracts",
  "PramaanChain.sol",
  "PramaanChain.json",
);

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function initialize() {
  const rpcUrl = required("SEPOLIA_RPC_URL");
  const contractAddress = getAddress(required("PRAMAAN_CHAIN_ADDRESS"));
  const expectedChainId = BigInt(
    process.env.BLOCKCHAIN_CHAIN_ID || "11155111",
  );
  const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
  const provider = new JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  if (network.chainId !== expectedChainId) {
    throw new Error(
      `Incorrect chain ID: expected ${expectedChainId}, got ${network.chainId}`,
    );
  }

  const code = await provider.getCode(contractAddress);
  if (code === "0x") {
    throw new Error("Contract not deployed at configured address");
  }

  const readContract = new Contract(contractAddress, artifact.abi, provider);
  const privateKey = process.env.ISSUER_PRIVATE_KEY;
  if (!privateKey) {
    return { provider, readContract, writeContract: null };
  }

  const issuerWallet = new Wallet(privateKey, provider);
  const expectedIssuer = getAddress(required("ISSUER_ADDRESS"));
  if (issuerWallet.address !== expectedIssuer) {
    throw new Error("Issuer private key does not match ISSUER_ADDRESS");
  }

  const authorized = await readContract.isAuthorizedIssuer(expectedIssuer);
  if (!authorized) {
    throw new Error("Issuer is not authorized");
  }

  return {
    provider,
    readContract,
    writeContract: readContract.connect(issuerWallet),
  };
}

const isEntrypoint = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  initialize()
    .then(({ writeContract }) => {
      console.log(
        `Blockchain connection ready (${writeContract ? "read/write" : "read-only"})`,
      );
    })
    .catch((error) => {
      console.error(`Initialization failed: ${error.message}`);
      process.exitCode = 1;
    });
}
