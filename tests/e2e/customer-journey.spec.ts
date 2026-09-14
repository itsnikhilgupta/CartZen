import { test, expect } from "@playwright/test";

test.describe("CartZen Customer Scan-and-Go Journey", () => {
  test("Complete Customer Journey: Login -> Select Store -> Start Session -> Scan Product -> View Cart", async ({
    page,
  }) => {
    // 1. Navigate to Login Page
    await page.goto("/login");
    await expect(page).toHaveTitle(/CartZen/i);

    // 2. Login as Customer
    await page.fill('input[type="email"]', "customer@cartzen.com");
    await page.fill('input[type="password"]', "Password123!");
    await page.click('button[type="submit"]');

    // Wait for URL to change away from /login
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });

    // Ensure home page loaded
    if (!page.url().endsWith("/")) {
      await page.goto("/");
    }

    // 3. Select Store #101
    await page.waitForSelector("text=CartZen Central Supermarket #101", { timeout: 15000 });
    await page.click("text=CartZen Central Supermarket #101");

    // Click Start Shopping Session button by ID
    const startButton = page.locator("#start-shopping-session-btn");
    await expect(startButton).toBeVisible({ timeout: 15000 });
    await startButton.click();

    // 4. Wait for redirect to Scan page
    await page.waitForURL((url) => url.pathname.includes("/scan"), { timeout: 15000 });

    // 5. Simulate Scanning Barcode "8901030000012" (Organic Whole Milk 1L)
    await page.click('button:has-text("Organic Milk 1L")');

    // Verify Scan Result Drawer opens with product details
    await expect(page.locator("h2:has-text('Organic Whole Milk 1L')")).toBeVisible({ timeout: 10000 });

    // Add to Cart
    await page.click('button:has-text("Add to Cart")');

    // 6. Navigate to Cart Page using explicit href selector
    await page.locator('a[href="/cart"]').first().click();
    await page.waitForURL((url) => url.pathname.includes("/cart"), { timeout: 15000 });

    // Verify Cart item and server-authoritative totals
    await expect(page.locator("h1:has-text('Your Shopping Cart')")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Organic Whole Milk 1L")).toBeVisible();
    await expect(page.locator("text=Sales Tax & GST (5%)")).toBeVisible();
    await expect(page.locator("button:has-text('Proceed to Pay')")).toBeVisible();
  });
});
