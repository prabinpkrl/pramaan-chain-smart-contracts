import path from "node:path";
import { getAddress } from "ethers";

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function integer(env, name, fallback, minimum = 1) {
  const value = env[name] === undefined ? fallback : Number(env[name]);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }
  return value;
}

export function loadConfig(env = process.env) {
  const appOrigin = env.APP_ORIGIN?.trim() || "http://localhost:5173";
  const parsedOrigin = new URL(appOrigin);
  const encryptionKey = Buffer.from(required(env, "APP_DATA_ENCRYPTION_KEY"), "base64");
  if (encryptionKey.length !== 32) {
    throw new Error("APP_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }

  let contractAddress;
  try {
    contractAddress = getAddress(
      env.PRAMAAN_CHAIN_ADDRESS?.trim()
        || "0x0bb21729BBDaBe54A289A1e924941F8F635Cab84",
    );
  } catch {
    throw new Error("PRAMAAN_CHAIN_ADDRESS must be a valid Ethereum address");
  }

  return {
    port: integer(env, "PORT", 4000),
    appOrigin: parsedOrigin.origin,
    siweDomain: env.SIWE_DOMAIN?.trim() || parsedOrigin.host,
    databasePath: path.resolve(env.DATABASE_PATH?.trim() || ".data/pramaan-app.sqlite"),
    encryptionKey,
    rpcUrl: required(env, "SEPOLIA_RPC_URL"),
    chainId: integer(env, "BLOCKCHAIN_CHAIN_ID", 11155111),
    contractAddress,
    cookieSecure: env.COOKIE_SECURE === "true",
    nonceTtlMs: 5 * 60 * 1000,
    sessionTtlMs: 8 * 60 * 60 * 1000,
  };
}
