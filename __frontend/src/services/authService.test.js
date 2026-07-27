import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  setCsrfToken: vi.fn(),
}));

vi.mock("./api", () => ({
  appApi: { get: mocks.get, post: mocks.post },
  setCsrfToken: mocks.setCsrfToken,
}));

import { connectWalletAndSignIn, getSession, logout } from "./authService";

describe("wallet authentication service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  it("requests a SIWE challenge without accepting a browser-supplied role", async () => {
    const address = "0x4e02876F9bfd58f9D2D542F9520055BeD3addd28";
    const walletRequest = vi.fn()
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce("0xsyntheticsignature");
    window.ethereum = { request: walletRequest };
    mocks.post
      .mockResolvedValueOnce({ data: { message: "synthetic SIWE message" } })
      .mockResolvedValueOnce({
        data: { address, roles: ["ISSUER"], csrfToken: "synthetic-csrf" },
      });

    const session = await connectWalletAndSignIn();

    expect(mocks.post).toHaveBeenNthCalledWith(1, "/auth/nonce", { address });
    expect(mocks.post.mock.calls[0][1]).not.toHaveProperty("role");
    expect(walletRequest).toHaveBeenNthCalledWith(2, {
      method: "personal_sign",
      params: ["synthetic SIWE message", address],
    });
    expect(mocks.setCsrfToken).toHaveBeenCalledWith("synthetic-csrf");
    expect(session.roles).toEqual(["ISSUER"]);
  });

  it("fails locally without an injected wallet", async () => {
    await expect(connectWalletAndSignIn()).rejects.toThrow("Install MetaMask");
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("refreshes and clears the in-memory CSRF token", async () => {
    mocks.get.mockResolvedValue({
      data: { roles: ["CITIZEN"], csrfToken: "refreshed-csrf" },
    });
    mocks.post.mockResolvedValue({ status: 204 });

    await expect(getSession()).resolves.toMatchObject({ roles: ["CITIZEN"] });
    expect(mocks.setCsrfToken).toHaveBeenCalledWith("refreshed-csrf");
    await logout();
    expect(mocks.setCsrfToken).toHaveBeenLastCalledWith(null);
  });
});
