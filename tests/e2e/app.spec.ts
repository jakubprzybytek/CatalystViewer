import { test, expect } from '@playwright/test';

// Against a test stage seeded from tests/fixtures (docs/testing.md), signed in as the test user (global-setup.ts).
// The default filters show corporate WIBOR bonds: 8 of the fixture bonds, from 7 issuers.

test('issuers view lists the issuers of the fixture bonds', async ({ page }) => {
  await page.goto('/');

  const cards = page.locator('.issuer-card');
  await expect(cards).toHaveCount(7, { timeout: 20_000 });
  await expect(cards.filter({ hasText: 'Allegro.eu SA' })).toHaveCount(1);
  // classified by the workflow, with the stubbed AI
  await expect(cards.filter({ hasText: 'art.Locum S.A.' })).toHaveCount(1);
});

test('menu shows the deployed version', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();

  // The pipeline passes the version it deployed; a local run only checks that one is shown.
  const expected = process.env.APP_VERSION;
  await expect(page.getByTestId('app-version')).toHaveText(expected ? `Version ${expected}` : /^Version \S+$/);
});

test('bonds view lists the updated and the new bonds, not the deactivated one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bonds' }).click();

  const cards = page.locator('.bond-card');
  await expect(cards).toHaveCount(8, { timeout: 20_000 });
  for (const name of ['ALE0630', 'ACH0628', 'ARL0429', 'ATL0429']) {
    await expect(cards.filter({ hasText: name }), name).toHaveCount(1);
  }
  await expect(cards.filter({ hasText: 'ARH0329' })).toHaveCount(0);
});
