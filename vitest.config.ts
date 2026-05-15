import { defineConfig, configDefaults } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, 'tests/smoke/**'],
  },
});