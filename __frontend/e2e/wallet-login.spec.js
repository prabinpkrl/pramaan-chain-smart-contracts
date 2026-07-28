import { expect, test } from "@playwright/test";
import {
  ADDRESSES,
  installMultipleWallets,
  installWallet,
  mockApis,
} from "./fixtures";

test("wallet login connects, switches to Sepolia, signs SIWE, and opens the derived portal", async ({ page }, testInfo) => {
  await installWallet(page);
  await mockApis(page, { signInRole: "ADMIN" });

  await page.goto("/login");
  await page.getByRole("button", { name: "Connect MetaMask" }).click();
  await expect(page.getByText("MetaMask connected")).toBeVisible();
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

test("multiple injected wallets are discovered and the chosen provider is used", async ({ page }) => {
  await installMultipleWallets(page);
  await mockApis(page, { signInRole: "ISSUER" });

  await page.goto("/login");
  await expect(page.getByText("2 browser wallets detected. Select the one you want to use.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect MetaMask" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect Rabby Wallet" })).toBeVisible();

  await page.getByRole("button", { name: "Connect Rabby Wallet" }).click();
  await expect(page.getByText("Rabby Wallet connected")).toBeVisible();
  await expect(page.getByText(`${ADDRESSES.issuer.slice(0, 6)}...${ADDRESSES.issuer.slice(-4)}`)).toBeVisible();
});

test("configured mobile login opens the WalletConnect QR modal", async ({ page }, testInfo) => {
  await mockApis(page);
  await page.goto("/login");

  if (await page.getByText(
    "Mobile QR requires WalletConnect configuration for this deployment.",
  ).isVisible()) {
    test.skip(true, "WalletConnect project ID is not configured for this build");
  }

  await page.getByRole("button", { name: /Connect mobile wallet/ }).click();
  await expect(page.locator("w3m-modal")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("wui-qr-code")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Mobile QR login is not configured for this environment yet.")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("walletconnect-qr.png"),
    fullPage: true,
    animations: "disabled",
  });
});
