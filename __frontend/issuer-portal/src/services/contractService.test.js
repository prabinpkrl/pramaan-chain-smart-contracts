import { describe, expect, it } from "vitest";
import { hashFile } from "./contractService";

describe("hashFile", () => {
  it("hashes the exact file bytes as a Solidity bytes32 value", async () => {
    const bytes = new TextEncoder().encode("synthetic certificate bytes");
    const file = { arrayBuffer: async () => bytes.buffer };
    await expect(hashFile(file)).resolves.toBe(
      "0xc383f79d7a70a4239162abd9aae19195f792f4b2ca6704a4788cb95d1fb136cd",
    );
  });

  it("rejects a missing file", async () => {
    await expect(hashFile(null)).rejects.toThrow("Select the exact certificate file");
  });
});
