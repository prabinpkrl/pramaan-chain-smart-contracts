import { describe, expect, it, vi } from "vitest";
import { appApi, blockchainApi, warmServices } from "./api";

describe("service warm-up", () => {
  it("starts both backends once without waiting on either result", async () => {
    const appHealth = vi.spyOn(appApi, "get").mockResolvedValue({});
    const gatewayHealth = vi.spyOn(blockchainApi, "get").mockRejectedValue(
      new Error("gateway is waking"),
    );

    await Promise.all([warmServices(), warmServices()]);

    expect(appHealth).toHaveBeenCalledOnce();
    expect(appHealth).toHaveBeenCalledWith("/health", { timeout: 90_000 });
    expect(gatewayHealth).toHaveBeenCalledOnce();
    expect(gatewayHealth).toHaveBeenCalledWith("/health", { timeout: 90_000 });
  });
});
