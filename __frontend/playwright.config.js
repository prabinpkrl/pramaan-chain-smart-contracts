import { defineConfig, devices } from "@playwright/test";

const live = process.env.LIVE_E2E === "1";
const frontendPort = process.env.E2E_FRONTEND_PORT || "5173";
const frontendUrl = `http://localhost:${frontendPort}`;

const frontendServer = {
  command: `npm run preview -- --host 127.0.0.1 --port ${frontendPort}`,
  url: frontendUrl,
  reuseExistingServer: false,
  timeout: 120_000,
  stdout: "pipe",
  stderr: "pipe",
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: !live,
  forbidOnly: true,
  retries: 1,
  workers: live ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
  },
  projects: live
    ? [{ name: "live-chromium", use: { ...devices["Desktop Chrome"] } }]
    : [
        { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
      ],
  webServer: live
    ? [
        {
          command: "npm --prefix ../backend start",
          url: "http://localhost:3000/api/health",
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "node e2e/start-live-app-backend.mjs",
          url: "http://localhost:4000/api/health",
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        frontendServer,
      ]
    : frontendServer,
  outputDir: "test-results",
});
