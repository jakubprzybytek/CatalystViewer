// Signs in once as the test user and saves the session for the tests (playwright.config.ts: storageState).
// Run inside `sst shell --stage <stage>` (npm run test:e2e). Global setup isn't traced, so the password stays out of reports.
import { chromium, type FullConfig } from '@playwright/test';
import { Resource } from 'sst';

export const STORAGE_STATE = 'tests/e2e/.auth/user.json'; // gitignored

export default async function globalSetup(config: FullConfig) {
  if (Resource.App.stage === 'prod') throw new Error('E2E tests never run against prod');

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(config.projects[0]!.use.baseURL!);
  await page.locator('input[type="email"]').fill(Resource.TestUser.email);
  await page.locator('input[type="password"]').fill(Resource.TestUserPassword.value);
  await page.locator('button[type="submit"]:has-text("Sign In")').click();
  await page.locator('input[type="email"]').waitFor({ state: 'detached', timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
