import { defineConfig } from 'vitest/config';

// API integration tests (tests/integration): run inside `sst shell --stage <stage>`, see docs/testing.md.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
