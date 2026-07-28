import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  delete window.__PRAMAAN_CONFIG__;
  vi.resetModules();
});

describe("runtime configuration", () => {
  it("uses Docker runtime values ahead of build-time defaults", async () => {
    window.__PRAMAAN_CONFIG__ = {
      appApiUrl: "http://localhost:4400/api",
      blockchainApiUrl: "http://localhost:3300/api",
      chainId: "11155111",
      contractAddress: "0x1111111111111111111111111111111111111111",
      publicAppUrl: "http://localhost:6173",
      walletConnectProjectId: "public-project-id",
    };

    const { config } = await import("./config.js");

    expect(config).toMatchObject({
      appApiUrl: "http://localhost:4400/api",
      blockchainApiUrl: "http://localhost:3300/api",
      chainId: 11155111,
      contractAddress: "0x1111111111111111111111111111111111111111",
      publicAppUrl: "http://localhost:6173",
      walletConnectProjectId: "public-project-id",
    });
  });

  it("allows Docker runtime configuration to disable WalletConnect", async () => {
    window.__PRAMAAN_CONFIG__ = { walletConnectProjectId: "" };

    const { config } = await import("./config.js");

    expect(config.walletConnectProjectId).toBe("");
  });
});
