import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 12"],
        defaultBrowserType: "chromium",
      },
    },
  ],
  // Skip local webServer when running against an external URL (e.g. Vercel preview)
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          // Explicitly pass DB env vars so the local file URL is correct even when
          // the devcontainer remoteEnv sets a broken default (colon-split issue).
          command:
            "TURSO_DATABASE_URL=file:./local.db TURSO_AUTH_TOKEN=local npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
