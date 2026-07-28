import { expect, test } from "@playwright/test";
import { installWallet, mockApis } from "./fixtures";

test("wallet login connects, switches to Sepolia, signs SIWE, and opens the derived portal", async ({ page }, testInfo) => {
  await installWallet(page);
  await mockApis(page, { signInRole: "ADMIN" });

  await page.goto("/login");
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await expect(page.getByText("Wallet connected")).toBeVisible();
  await expect(page.getByText("Chain 0x1")).toBeVisible();
  await page.getByRole("button", { name: "Switch to Sepolia" }).click();
  await expect(page.getByTestId("wallet-network")).toHaveText("Sepolia");
  await page.screenshot({
    path: testInfo.outputPath("login-wallet-ready.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Sign message and continue" }).click();
  await expect(page).toHaveURL("/admin/dashboard");
  await expect(page.getByRole("heading", { name: "System overview" })).toBeVisible();
});
