import { test, expect, type Page } from '@playwright/test';
import { Resource } from 'sst';

// Run inside `sst shell --stage <stage>` (npm run test:smoke:int): the test user comes from
// Resource.TestUser and Resource.TestUserPassword (docs/development.md). Never against prod.

// The login test types the password: no traces, so it can't end up in a report.
test.use({ trace: 'off' });

test.describe.serial('Smoke Tests', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    if (Resource.App.stage === 'prod') throw new Error('Smoke tests log in and never run against prod');
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('App is up', async () => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Login works', async () => {
    // Custom AuthWrapper renders email + password fields
    await page.locator('input[type="email"]').fill(Resource.TestUser.email);
    await page.locator('input[type="password"]').fill(Resource.TestUserPassword.value);
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Sign-in form disappears
    await expect(page.locator('input[type="email"]')).not.toBeVisible();
  });

  test('Data is displayed', async () => {
    // Already logged in: describe.serial shares the page.
    const issuersToggleButton = page.getByRole('button', { name: 'Issuers' });
    await expect(issuersToggleButton).toBeVisible({ timeout: 15000 });
    await issuersToggleButton.click();

    const anyIssuerCard = page.locator('.issuer-card').first();
    await expect(anyIssuerCard).toBeVisible({ timeout: 15000 });

    const newBondsToggleButton = page.getByRole('button', { name: 'Bonds' });
    await expect(newBondsToggleButton).toBeVisible();
    await newBondsToggleButton.click();

    const bondCard = page.locator('.bond-card').first();
    await expect(bondCard).toBeVisible({ timeout: 15000 });
  });
});
