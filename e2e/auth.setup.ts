/**
 * E2E Authentication Setup
 * 
 * Handles authentication for E2E tests using Clerk
 * 
 * Usage:
 * 1. Sign in once manually and save the session
 * 2. Reuse the session for all tests
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Navigate to sign-in page
  await page.goto("/sign-in");

  // TODO: Configure Clerk test mode authentication
  // Option 1: Use Clerk test mode with test credentials
  // Option 2: Use Clerk's test API to create a session
  // Option 3: Mock authentication for E2E tests

  // For now, this is a placeholder
  // In production, you would:
  // 1. Fill in test credentials
  // 2. Click sign-in button
  // 3. Wait for redirect to dashboard
  // 4. Save the session state

  // Example (when Clerk test mode is configured):
  /*
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || "test@example.com");
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || "test-password");
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard");
  */

  // Save signed-in state to reuse in tests
  await page.context().storageState({ path: authFile });
});

