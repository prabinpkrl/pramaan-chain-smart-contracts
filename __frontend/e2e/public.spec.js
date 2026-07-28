import { expect, test } from "@playwright/test";
import { HASHES, expectNoHorizontalOverflow, mockApis } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test("landing page presents the privacy-first proof story", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Proof you can verify/i })).toBeVisible();
  await expect(page.getByText("No certificate file or personal data on-chain")).toBeVisible();
  await expect(page.getByRole("link", { name: "Verify a document" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("public verifier accepts a hash and presents an active result", async ({ page }, testInfo) => {
  await page.goto("/verify");
  await expect(page.getByRole("heading", { name: "Verify an exact certificate proof." })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("verify-empty.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("tab", { name: "Document hash" }).click();
  await page.getByLabel("SHA-256 document hash").fill(HASHES.active);
  await page.getByRole("button", { name: "Verify hash" }).click();
  await expect(page).toHaveURL(`/verify/${HASHES.active}`);
  await expect(page.getByRole("heading", { name: "Active certificate" })).toBeVisible();
  await expect(page.getByText("View on Sepolia Etherscan")).toBeVisible();
});

test("public verifier hashes a selected file locally", async ({ page }) => {
  await page.goto("/verify");
  await page.getByLabel("Choose the original certificate file").setInputFiles({
    name: "synthetic-certificate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("PramaanChain E2E synthetic certificate"),
  });
  await expect(page.getByText(/Ready to hash locally/)).toBeVisible();
  await page.getByRole("button", { name: "Verify document" }).click();
  await expect(page.getByRole("heading", { name: "Active certificate" })).toBeVisible();
});

test("login page communicates wallet and SIWE boundaries", async ({ page }, testInfo) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Enter your workspace" })).toBeVisible();
  await expect(page.getByText("Browser wallet required")).toBeVisible();
  await expect(page.getByRole("link", { name: "Verify without signing in" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("login-no-wallet.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("public pages fit a compact 320px phone viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Compact mobile-only check");
  await page.setViewportSize({ width: 320, height: 800 });

  for (const [path, heading] of [
    ["/", /Proof you can verify/i],
    ["/verify", "Verify an exact certificate proof."],
    ["/login", "Enter your workspace"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await page.screenshot({
    path: testInfo.outputPath("login-compact-320.png"),
    fullPage: true,
    animations: "disabled",
  });
});
