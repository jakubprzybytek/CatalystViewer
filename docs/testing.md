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

## Integration Tests

> **Not yet implemented.** The design below describes the intended approach. No fixture files, no `int` environment, and no test code exist yet.

Integration tests will run against a dedicated `int` environment with **stable, fixture-based data** — no live internet fetching. This makes the tests deterministic and repeatable regardless of what the real Catalyst/Obligacje.pl sites serve at any given time.

### How the fixture data works

The `int` environment runs the **Bonds Update workflow** (AWS Step Function) in a *test mode*. In test mode the workflow's data-fetching steps read from **local fixture files** (Excel spreadsheets, HTML pages) stored on disk instead of downloading them from the internet. This guarantees the exact same bond data is loaded every time the workflow runs.

Fixture files are committed to the repository under `tests/fixtures/` and cover a representative, stable snapshot of bonds and issuers.

### Deployment trigger

During deployment to `int`, the Bonds Update workflow is automatically triggered in test mode. By the time the deployment completes, the database is populated with the fixture data and the environment is ready to test against.

### The date-sensitivity problem

Bonds are time-bound instruments — they have an issue date and a maturity date, and the system computes live values relative to the current date at several points:

- `CatalystDownload.ts` — resolves the XLS filename from yesterday's date (`catalyst_YYYYMMDD.xls`)
- `updateBondReports.ts` — defines the 30-day liquidity window and writes `year`/`month` partition keys into `BondStatistics`
- `getBondReports.ts` — computes `daysToMaturity` and finds the current interest period by scanning `interestPayoffDayTss` for a value `>= today`
- `getBondQuotes.ts` — queries the 30-day quote history window (must align with what `updateBondReports` wrote)

If fixtures contain bonds with fixed maturity dates, they will eventually mature. When that happens, `getBondReports` cannot find a current interest period (`interestPeriodIndex === -1`), causing a runtime crash — not just incorrect display values.

**Three approaches to address this:**

**Option A — Inject a reference date (recommended).** A `REFERENCE_DATE` environment variable (e.g. `"2024-11-01"`) is stored alongside the fixture files. All four `new Date()` call sites above read this variable in test mode and fall back to `new Date()` in production. This requires:
- A `getReferenceDate()` helper in `packages/core` that reads `process.env.REFERENCE_DATE`
- Passing `REFERENCE_DATE` as an environment variable to the `BondsUpdater` and `GetBondReports` Lambda functions when deployed to `int`
- Storing `REFERENCE_DATE` in a sidecar file next to the fixtures (e.g. `tests/fixtures/metadata.json`) so tests and assertions know what date the data represents

This approach has zero ongoing maintenance. Fixtures remain a genuine frozen snapshot, and parser regression coverage is fully preserved — if the real sites change their HTML structure, the fixture will fail to parse and the failure is caught.

**Option B — Periodic fixture refresh.** A script or CI scheduled job re-downloads real fixtures and commits them. A sidecar file records the capture date. Bonds in the fixtures are always currently active because they were just captured.

Downside: someone must run the refresh before bonds mature; CI degrades silently until the next run; real-site structure changes may go unnoticed.

**Option C — Generate fixtures dynamically before each test run.** Fixture files are produced from templates with dates relative to the current date, so they never expire.

Downside: the generators must emit correct HTML and a valid XLS binary, and they must stay in sync with the real sites' markup. More critically, the generators would produce exactly the HTML the parsers are written to consume — a real-site change that would break production becomes invisible because tests still pass. Parser regression coverage is lost entirely.

### Test layers

Two layers of tests run against the `int` environment:

1. **API integration tests** — call the backend API directly (without a browser) and assert on the shape and content of the responses. These live in `tests/integration/` and use [Vitest](https://vitest.dev/).
2. **E2E tests** — drive a real browser with [Playwright](https://playwright.dev/) and verify that the UI correctly fetches and renders data. These live in `tests/e2e/` and share infrastructure with the existing smoke tests.

### How to run integration tests

**Against Integration (`int`) environment:**
```bash
npm run test:integration:int
```

**Against a custom URL:**
Create an `.env.local` file in the repository root and set the API base URL, then run:
```bash
npm run test:integration
```

### How to run E2E tests

```bash
npm run test:e2e:int
```

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
