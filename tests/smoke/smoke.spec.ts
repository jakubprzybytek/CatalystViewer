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

    // Custom AuthWrapper renders email + password fields
    await page.locator('input[type="email"]').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Verify successful login — sign-in form disappears
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
  });

  test('Data is displayed', async () => {
    // 3. Data is displayed — assert that bond data is fetched and rendered in the UI.
    const username = process.env.TEST_USERNAME;
    const password = process.env.TEST_PASSWORD;

    test.skip(!username || !password, 'TEST_USERNAME and TEST_PASSWORD environment variables are required for this test.');

    // We are already logged in here because of describe.serial and shared `page`.

    // Click on 'Issuers' tab
    const issuersToggleButton = page.getByRole('button', { name: 'Issuers' });
    await expect(issuersToggleButton).toBeVisible({ timeout: 15000 });
    await issuersToggleButton.click();

    // There should be issuer cards available on the page below the header/filters
    const anyIssuerCard = page.locator('.issuer-card').first();
    await expect(anyIssuerCard).toBeVisible({ timeout: 15000 });

    // Switch to 'New Bonds' tab to check bonds
    const newBondsToggleButton = page.getByRole('button', { name: 'New Bonds' });
    await expect(newBondsToggleButton).toBeVisible();
    await newBondsToggleButton.click();

    // Check if individual bonds are visible
    const bondCard = page.locator('.bond-card').first();
    await expect(bondCard).toBeVisible({ timeout: 15000 });
  });

});

