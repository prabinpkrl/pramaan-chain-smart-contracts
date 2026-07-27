import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function createCryptoBox(masterKey) {
  const encryptionKey = Buffer.from(
    hkdfSync("sha256", masterKey, Buffer.from("pramaanchain-app"), Buffer.from("field-encryption-v1"), 32),
  );
  const lookupKey = Buffer.from(
    hkdfSync("sha256", masterKey, Buffer.from("pramaanchain-app"), Buffer.from("blind-index-v1"), 32),
  );

  return {
    encrypt(value) {
      if (value === null || value === undefined) return null;
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
      const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
    },

    decrypt(envelope) {
      if (envelope === null || envelope === undefined) return null;
      const [version, ivText, tagText, ciphertextText] = String(envelope).split(".");
      if (version !== "v1" || !ivText || !tagText || ciphertextText === undefined) {
        throw new Error("Encrypted field has an unsupported format");
      }
      const decipher = createDecipheriv(
        "aes-256-gcm",
        encryptionKey,
        Buffer.from(ivText, "base64url"),
      );
      decipher.setAuthTag(Buffer.from(tagText, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextText, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    },

    blindIndex(value) {
      return createHmac("sha256", lookupKey)
        .update(String(value).trim().toLowerCase())
        .digest("hex");
    },
  };
}

export function hashSecret(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function safeHashEqual(value, expectedHash) {
  const actual = Buffer.from(hashSecret(value), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
