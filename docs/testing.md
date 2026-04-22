# Testing

## Unit Tests

Unit tests are written with [Vitest](https://vitest.dev/) and live alongside the source files they test, using the `.test.ts` suffix.

**Run all unit tests:**
```bash
npm run test
```

This runs `vitest run` from the workspace root and picks up all `*.test.ts` files across all packages (`packages/core`, `packages/web`, etc.).

### What is covered

| Package | Test files |
|---------|-----------|
| `packages/core` | Bond quote page parsers, bond information page parsers |
| `packages/web` | Array utilities, number/date formatters, yield-to-maturity calculations |

---

## Smoke Tests

Smoke tests live in `/tests/smoke` and use [Playwright](https://playwright.dev/).

The goal is a small set of tests that verify the application is working from a user's perspective:

1. **App is up** — open the URL and confirm the page loads.
2. **Login works** — authenticate with a test account via the Amplify/Cognito login flow.
3. **Data is displayed** — assert that bond data is fetched and rendered in the UI.

These tests assume the backend is already deployed and that a base set of bond data is present in the database. They do not seed or tear down any data.

### How to run smoke tests

**Locally / Custom URL:**
Create an `.env.local` file in the repository root:
```env
TEST_USERNAME=your_test_username_here
TEST_PASSWORD=your_test_password_here
# Optional: override the base URL (defaults to http://localhost:3000)
# PLAYWRIGHT_TEST_BASE_URL=https://my-preview.url
```
Then run:
```bash
npm run test:smoke
```

**Against Integration (`int`) environment:**
```bash
npm run test:smoke:int
```
*(This sets `STAGE=int` to automatically resolve the integration URL).*
