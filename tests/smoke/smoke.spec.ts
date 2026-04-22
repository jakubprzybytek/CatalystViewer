import { test, expect, type Page } from '@playwright/test';

// Use describe.serial so these tests run sequentially in the same order
test.describe.serial('Smoke Tests', () => {
  let page: Page;

  // Create a single browser page to share across these tests
  test.beforeAll(async ({ browser }) => {
    const isPasswordSet = !!process.env.TEST_PASSWORD;
    console.log(`Smoke test config - Username: ${process.env.TEST_USERNAME || '<not set>'}, Password set: ${isPasswordSet}`);
    
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('App is up', async () => {
    // 1. App is up — open the URL and confirm the page loads.
    await page.goto('/');
    
    // We expect the page to load without error. 
    // You can adjust the exact title or element it expects to see on load.
    await expect(page.locator('body')).toBeVisible();
  });

  test('Login works', async () => {
    // 2. Login works — authenticate with a test account via the Amplify/Cognito login flow.
    const username = process.env.TEST_USERNAME as string;
    const password = process.env.TEST_PASSWORD as string;

    test.skip(!username || !password, 'TEST_USERNAME and TEST_PASSWORD environment variables are required for this test.');

    // We are already at '/' from the previous test.

    // Assuming AWS Amplify standard UI components:
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]:has-text("Sign in")').click();

    // Verify successful login (e.g., login form disappears or main nav appears)
    // Customize this selector based on your actual authenticated state UI
    await expect(page.locator('input[name="username"]')).not.toBeVisible();
  });

  test('Data is displayed', async () => {
    // 3. Data is displayed — assert that bond data is fetched and rendered in the UI.
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    test.skip(!username || !password, 'TEST_USERNAME and TEST_PASSWORD environment variables are required for this test.');

    // We are already logged in here because of describe.serial and shared `page`.

    // Wait for the login to complete and data fetching to happen
    // Based on the workspace schema, you have BondCard and IssuersList components.
    // The exact class or text might be different, adjust slightly if needed.
    
    // Example: Wait for at least one issuer or bond card to be visible
    const bondDataContainer = page.getByText('Bonds', { exact: false }).first();
    await expect(bondDataContainer).toBeVisible({ timeout: 15000 });
  });

});

