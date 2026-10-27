import { defineConfig, devices } from '@playwright/test';
import { Resource } from 'sst';

// Run inside `sst shell --stage <stage>`; the stage picks the site. PLAYWRIGHT_TEST_BASE_URL overrides it (e.g. localhost).
const stageUrls: Record<string, string> = {
  dev: 'https://dev.catalyst.albedoonline.com',
  int: 'https://int.catalyst.albedoonline.com',
};
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || stageUrls[Resource.App.stage];
if (!baseURL) throw new Error(`No site for stage ${Resource.App.stage}`);

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
