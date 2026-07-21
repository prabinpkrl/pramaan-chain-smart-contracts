import { expect } from "chai";
import { assertExpectedChainId } from "../scripts/network-safety.js";

describe("deployment network safety", function () {
  it("accepts the documented local and Sepolia chain IDs", function () {
    expect(() => assertExpectedChainId("localhost", 31337n)).not.to.throw();
    expect(() => assertExpectedChainId("sepolia", 11155111n)).not.to.throw();
  });

  it("rejects a mismatched chain ID before deployment", function () {
    expect(() => assertExpectedChainId("sepolia", 1n)).to.throw(
      "Refusing sepolia: expected chain ID 11155111, received 1",
    );
  });

  it("rejects unsupported deployment networks", function () {
    expect(() => assertExpectedChainId("mainnet", 1n)).to.throw(
      "Deployment is disabled for unsupported network: mainnet",
    );
  });
});
