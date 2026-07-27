import { describe, expect, it } from "vitest";
import { verificationUrl } from "./format";

describe("verificationUrl", () => {
  it("contains only the public route and document hash", () => {
    const hash = `0x${"12".repeat(32)}`;
    const url = verificationUrl("https://verify.example/", hash);
    expect(url).toBe(`https://verify.example/verify/${hash}`);
    expect(url).not.toContain("citizen");
    expect(url).not.toContain("institution");
    expect(url).not.toContain("transactionHash");
  });
});
