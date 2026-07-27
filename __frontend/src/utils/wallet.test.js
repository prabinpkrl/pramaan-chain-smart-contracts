import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEPOLIA_CHAIN_ID,
  chooseWalletAccount,
  connectWallet,
  formatWalletBalance,
  requestNetworkSwitch,
} from "./wallet";

describe("wallet connection helpers", () => {
  beforeEach(() => {
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  it("connects and reads the selected account, chain, and balance", async () => {
    const address = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";
    const request = vi.fn()
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce(SEPOLIA_CHAIN_ID)
      .mockResolvedValueOnce("0x16345785d8a0000");
    window.ethereum = { request };

    await expect(connectWallet()).resolves.toEqual({
      address,
      chainId: SEPOLIA_CHAIN_ID,
      balance: "0.1",
    });
    expect(request).toHaveBeenNthCalledWith(3, {
      method: "eth_getBalance",
      params: [address, "latest"],
    });
  });

  it("adds Sepolia when the wallet does not know the chain", async () => {
    const error = Object.assign(new Error("unknown chain"), { code: 4902 });
    const request = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(null);
    window.ethereum = { request };

    await requestNetworkSwitch();

    expect(request).toHaveBeenNthCalledWith(1, {
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
    expect(request.mock.calls[1][0]).toMatchObject({
      method: "wallet_addEthereumChain",
    });
  });

  it("requests account selection before reconnecting", async () => {
    const address = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";
    const request = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce(SEPOLIA_CHAIN_ID)
      .mockResolvedValueOnce("0x0");
    window.ethereum = { request };

    await expect(chooseWalletAccount()).resolves.toMatchObject({ address });
    expect(request).toHaveBeenNthCalledWith(1, {
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  });

  it("formats wei without floating-point precision loss", () => {
    expect(formatWalletBalance("0xde0b6b3a7640000")).toBe("1");
    expect(formatWalletBalance("0x16345785d8a0000")).toBe("0.1");
  });

  it("keeps the wallet connected when balance lookup is unavailable", async () => {
    const address = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";
    const request = vi.fn()
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce(SEPOLIA_CHAIN_ID)
      .mockRejectedValueOnce(new Error("RPC unavailable"));
    window.ethereum = { request };

    await expect(connectWallet()).resolves.toEqual({
      address,
      chainId: SEPOLIA_CHAIN_ID,
      balance: null,
    });
  });
});
