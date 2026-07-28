import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, mockApis } from "./fixtures";

const PORTALS = [
  {
    role: "ADMIN",
    routes: [
      ["/admin/dashboard", "System overview"],
      ["/admin/issuers", "Institutions and issuers"],
      ["/admin/monitor", "Blockchain monitor"],
      ["/admin/audit-logs", "Audit logs"],
    ],
  },
  {
    role: "ISSUER",
    routes: [
      ["/issuer/dashboard", "Tribhuvan University"],
      ["/issuer/issue", "Issue certificates"],
      ["/issuer/documents", "Document registry"],
      ["/issuer/revoked", "Revoked certificates"],
      ["/issuer/profile", "Issuer profile"],
    ],
  },
  {
    role: "CITIZEN",
    routes: [
      ["/citizen/dashboard", "Your private proof workspace"],
      ["/citizen/connect", "Connect an institution"],
      ["/citizen/requests", "Certificate requests"],
      ["/citizen/my-documents", "My documents"],
      ["/citizen/history", "Verification history"],
    ],
  },
];

for (const portal of PORTALS) {
  test(`${portal.role.toLowerCase()} portal renders every protected route`, async ({ page }, testInfo) => {
    await mockApis(page, { role: portal.role });
    for (const [path, heading] of portal.routes) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: testInfo.outputPath(`${portal.role.toLowerCase()}-${path.split("/").at(-1)}.png`),
        fullPage: true,
        animations: "disabled",
      });
    }
  });
}

test("mobile portal navigation opens and routes correctly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile-only interaction");
  await mockApis(page, { role: "CITIZEN" });
  await page.goto("/citizen/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "CITIZEN portal" })).toBeVisible();
  await page.getByRole("link", { name: "My Documents" }).click();
  await expect(page).toHaveURL("/citizen/my-documents");
  await expect(page.getByRole("heading", { name: "My documents" })).toBeVisible();
});

test("portal shell fits a compact 320px phone viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Compact mobile-only check");
  await page.setViewportSize({ width: 320, height: 800 });
  await mockApis(page, { role: "CITIZEN" });
  await page.goto("/citizen/dashboard");
  await expect(page.getByRole("heading", { name: "Your private proof workspace" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath("citizen-dashboard-compact-320.png"),
    fullPage: true,
    animations: "disabled",
  });
});
