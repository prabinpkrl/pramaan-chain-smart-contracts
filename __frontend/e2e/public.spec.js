import { expect, test } from "@playwright/test";
import { HASHES, expectNoHorizontalOverflow, mockApis } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test("landing page presents the privacy-first proof story", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /The document stays with you/i })).toBeVisible();
  await expect(page.getByText("The original file stays on this device. Only its digest is checked.")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Paste hash" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("SHA-256 document hash")).toBeVisible();
  await expect(page.getByText("SHA-256 in your browser")).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("landing proof chamber hashes a file locally and opens its public proof", async ({ page }) => {
  const rawCertificate = "PramaanChain landing proof chamber synthetic certificate";
  const outgoingBodies = [];
  page.on("request", (request) => {
    if (request.postData()) outgoingBodies.push(request.postData());
  });

  await page.goto("/");
  await page.getByRole("tab", { name: "Use file" }).click();
  await page.getByLabel("Certificate file", { exact: true }).setInputFiles({
    name: "synthetic-certificate.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(rawCertificate),
  });
  await expect(page.getByText(/Local fingerprint ready/)).toBeVisible();
  await expect(page.getByText(/^0x[a-f0-9]{12}···[a-f0-9]{10}$/)).toBeVisible();
  await page.getByRole("button", { name: "Check this proof" }).click();
  await expect(page).toHaveURL(/\/verify\/0x[a-f0-9]{64}$/);
  await expect(page.getByRole("heading", { name: "Active certificate" })).toBeVisible();
  expect(outgoingBodies.join(" ")).not.toContain(rawCertificate);
});

test("landing proof chamber accepts an existing SHA-256 hash", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "Paste hash" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("SHA-256 document hash").fill(HASHES.active);
  await page.getByRole("button", { name: "Check this proof" }).click();
  await expect(page).toHaveURL(`/verify/${HASHES.active}`);
  await expect(page.getByRole("heading", { name: "Active certificate" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Choose a wallet" })).toBeVisible();
  await expect(page.getByText("No browser wallet was detected. Use a mobile wallet or follow the installation guide.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Connect mobile wallet/ })).toBeVisible();
  await expect(page.getByText("Never enter a seed phrase or private key on this website.")).toBeVisible();
  await expect(page.getByRole("link", { name: "MetaMask" })).toHaveAttribute("href", "https://metamask.io/download/");
  await expect(page.getByRole("link", { name: "Rabby" })).toHaveAttribute("href", "https://rabby.io/");
  await expect(page.getByRole("link", { name: "Coinbase Wallet" })).toHaveAttribute("href", "https://www.coinbase.com/wallet/downloads");
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
    ["/", /The document stays with you/i],
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
