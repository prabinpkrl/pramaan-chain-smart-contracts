import { describe, expect, it } from "vitest";
import { hashDocument } from "./hashDocument";

describe("hashDocument", () => {
  it("hashes the exact file bytes as a Solidity bytes32 value", async () => {
    const bytes = new TextEncoder().encode("synthetic certificate bytes");
    const file = { arrayBuffer: async () => bytes.buffer };
    await expect(hashDocument(file)).resolves.toBe(
      "0xc383f79d7a70a4239162abd9aae19195f792f4b2ca6704a4788cb95d1fb136cd",
    );
  });
});
