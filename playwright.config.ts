import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 * 
 * Run with: npx playwright test
 * UI mode: npx playwright test --ui
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    // Setup project - runs authentication once
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Tests that require authentication
    {
      name: "chromium",
      use: { 
        ...devices["Desktop Chrome"],
        // Use saved authentication state
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: { 
        ...devices["Desktop Firefox"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: { 
        ...devices["Desktop Safari"],
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

