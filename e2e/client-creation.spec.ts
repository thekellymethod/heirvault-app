/**
 * E2E Tests: Client Creation Flow
 * 
 * Tests the complete flow of creating a client, including:
 * - Authentication
 * - Client creation form
 * - Policy creation
 * - Beneficiary creation
 */

import { test, expect } from "@playwright/test";

test.describe("Client Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/attorney/sign-in");
    
    // TODO: Set up test authentication
    // For now, skip if not authenticated
    // In production, use Clerk test mode or mock authentication
  });

  test("should create a new client with all required fields", async ({ page }) => {
    // Navigate to client creation page
    await page.goto("/dashboard/clients/new");

    // Fill in client form
    await page.fill('input[name="firstName"]', "John");
    await page.fill('input[name="lastName"]', "Doe");
    await page.fill('input[name="email"]', `john.doe.${Date.now()}@example.com`);
    await page.fill('input[name="phone"]', "555-0100");

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to client detail page
    await page.waitForURL(/\/dashboard\/clients\/[^/]+$/, { timeout: 10000 });

    // Verify client was created
    await expect(page.locator("h1")).toContainText("John Doe");
  });

  test("should show validation errors for missing required fields", async ({ page }) => {
    await page.goto("/dashboard/clients/new");

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator("text=required")).toBeVisible();
  });

  test("should create a policy for a client", async ({ page }) => {
    // First create a client (or use existing test client)
    await page.goto("/dashboard/clients/new");
    await page.fill('input[name="firstName"]', "Test");
    await page.fill('input[name="lastName"]', "Client");
    await page.fill('input[name="email"]', `test.${Date.now()}@example.com`);
    await page.click('button[type="submit"]');

    // Wait for client page
    await page.waitForURL(/\/dashboard\/clients\/[^/]+$/, { timeout: 10000 });

    // Navigate to policies page
    await page.click('a:has-text("Policies")');

    // Click "New Policy" button
    await page.click('button:has-text("New Policy")');

    // Fill policy form
    await page.fill('input[name="insurerName"]', "Test Insurance");
    await page.fill('input[name="policyNumber"]', "POL-12345");
    await page.selectOption('select[name="policyType"]', "TERM");

    // Submit
    await page.click('button[type="submit"]');

    // Verify policy was created
    await expect(page.locator("text=POL-12345")).toBeVisible();
  });

  test("should create a beneficiary for a client", async ({ page }) => {
    // Navigate to client's beneficiaries page
    await page.goto("/dashboard/clients");
    
    // Click on first client (or create one)
    await page.click('a[href*="/dashboard/clients/"]:first-child');

    // Navigate to beneficiaries
    await page.click('a:has-text("Beneficiaries")');

    // Click "New Beneficiary"
    await page.click('button:has-text("New Beneficiary")');

    // Fill beneficiary form
    await page.fill('input[name="firstName"]', "Jane");
    await page.fill('input[name="lastName"]', "Beneficiary");
    await page.fill('input[name="relationship"]', "Daughter");
    await page.fill('input[name="email"]', "jane@example.com");

    // Submit
    await page.click('button[type="submit"]');

    // Verify beneficiary was created
    await expect(page.locator("text=Jane Beneficiary")).toBeVisible();
  });
});

