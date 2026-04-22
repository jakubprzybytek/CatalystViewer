import { defineConfig, devices } from '@playwright/test';

const stage = process.env.STAGE;
const stageUrls: Record<string, string> = {
  'int': 'https://int.catalyst.albedoonline.com'
};
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || (stage && stageUrls[stage]) || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
