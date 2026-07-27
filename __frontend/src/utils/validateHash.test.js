import { describe, expect, it } from "vitest";
import { isValidDocumentHash } from "./validateHash";

describe("document hash validation", () => {
  it("accepts a 0x-prefixed 32-byte hexadecimal digest", () => {
    expect(isValidDocumentHash(`0x${"a5".repeat(32)}`)).toBe(true);
  });

  it("rejects missing prefixes, incorrect lengths, and non-hexadecimal input", () => {
    expect(isValidDocumentHash("a5".repeat(32))).toBe(false);
    expect(isValidDocumentHash(`0x${"a5".repeat(31)}`)).toBe(false);
    expect(isValidDocumentHash(`0x${"zz".repeat(32)}`)).toBe(false);
  });
});
