import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
  test: {
    // tests/ holds the integration and E2E tests, which run against a deployed stage
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
});