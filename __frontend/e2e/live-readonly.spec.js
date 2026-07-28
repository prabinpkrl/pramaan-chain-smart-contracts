import { expect, test } from "@playwright/test";

const REVOKED_HASH = "0x6a1c557dab491820c0c90770d46d60f06c809a76cd0b1afa9691be0397d4ab6d";

test("@live actual gateway, application backend, and frontend run together read-only", async ({ page, request }) => {
  test.skip(process.env.LIVE_E2E !== "1", "Run with npm run test:e2e:live");

  const gatewayHealth = await request.get("http://localhost:3000/api/health");
  expect(gatewayHealth.ok()).toBeTruthy();
  expect(String((await gatewayHealth.json()).chainId)).toBe("11155111");

  const appHealth = await request.get("http://localhost:4000/api/health");
  expect(appHealth.ok()).toBeTruthy();

  await page.goto(`/verify/${REVOKED_HASH}`);
  await expect(page.getByRole("heading", { name: "Revoked certificate" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("complementary").getByText(REVOKED_HASH)).toBeVisible();
});
