import { describe, expect, it } from "vitest";
import { validateIssuerAddress } from "./contractService";

describe("administrator issuer address validation", () => {
  it("normalizes a valid issuer address", () => {
    expect(
      validateIssuerAddress("0x4e02876f9bfd58f9d2d542f9520055bed3addd28"),
    ).toBe("0x4e02876F9bfd58f9D2D542F9520055BeD3addd28");
  });

  it("rejects malformed and zero addresses before wallet confirmation", () => {
    expect(() => validateIssuerAddress("not-an-address")).toThrow(
      "Enter a valid Ethereum issuer address",
    );
    expect(() => validateIssuerAddress(`0x${"0".repeat(40)}`)).toThrow(
      "The zero address cannot be authorized",
    );
  });
});
