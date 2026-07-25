const SECRET_NAMES = [
  "SEPOLIA_RPC_URL",
  "ISSUER_PRIVATE_KEY",
  "WRITE_API_KEY",
];

export function redactSecrets(value) {
  let result = String(value ?? "");

  for (const name of SECRET_NAMES) {
    const secret = process.env[name];
    if (secret) result = result.split(secret).join("[REDACTED]");
  }

  return result;
}
