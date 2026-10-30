# Testing

| Kind | Where | Runs against | Command |
|---|---|---|---|
| Type check | everything | the code | `npm run typecheck` |
| Unit (Vitest) | `packages/*/src/**/*.test.ts` | the code | `npm test` |
| Integration (Vitest) | `tests/integration/` | the API of a test stage | `npx sst shell --stage int -- npm run test:integration` |
| E2E (Playwright) | `tests/e2e/` | the site of a test stage | `npx sst shell --stage int -- npm run test:e2e` |

The pipeline (`continuous-delivery.yaml`) runs the type check and unit tests, deploys `int`, seeds it, then runs the integration and E2E tests; only then is the release tagged and deployed to prod. Nothing logs in to prod.

## The test stage: `int` on fixtures

`int` never touches the live sites or paid services, and always holds the same data, so the tests get the same results on any day:

| | `int` | how |
|---|---|---|
| Sources (gpwcatalyst.pl, obligacje.pl) | saved files in `tests/fixtures/sources/` | `SOURCE_FIXTURES`, bundled with the Bonds Updater Lambda (`infra/updater.ts`, `packages/core/src/common/Fixtures.ts`) |
| Date | the fixtures' reference date, `2026-10-27 12:00 UTC` | `REFERENCE_DATE` for the functions, `NEXT_PUBLIC_REFERENCE_DATE` for the site (`common/Clock.ts` in core and web) |
| Data | reset before the tests | `npm run seed` (`scripts/seed-int/seed-int.ts`) |
| AI (Bedrock, Tavily) | stubbed: fixed classification and analysis; to run the real AI, see [development.md](development.md#testing-the-ai-features-locally) | `AI_MODE=stub` (`packages/core/src/ai/issuers/IssuerStubs.ts`) |
| Emails | logged, not sent | `EMAIL_MODE=log` (`packages/functions/src/emails/EmailClient.ts`) |
| Bonds Updater schedule | off (prod only) | `scheduleEnabled` |

The flags are set in `infra/stage.ts`: fixtures and the reference date on `int`, AI and email stubs on every stage but `prod` (so `dev` too).

### Seeding

`npx sst shell --stage int -- npm run seed` (refuses any stage but `int` and `dev`):

1. empties the app's tables (bonds, quote history, issuer profiles, jobs, user profiles);
2. writes `tests/fixtures/db/*.json` (raw DynamoDB items);
3. runs the Bonds Updater state machine on the fixture sources and waits for it (`--no-update` skips this).

After it, `int` has what one updater run on the fixtures produces: a job record, updated prices and interest, the new bonds, the deactivated bond, and the new issuer classified by the stubbed AI.

### The fixtures

`tests/fixtures/metadata.json` lists the reference date and the bonds:

- **updated** (seeded and in the sources): corporate WIBOR, fixed and EUR bonds, treasury, BGK, EIB, municipal and mortgage covered bonds;
- **new** (in the sources only): created from their obligacje.pl pages; one issuer, art.Locum, has no profile, so the workflow classifies it;
- **deactivated** (seeded only): no longer in the daily statistics.

The sources are the live pages and the daily statistics file of the capture day, trimmed to these bonds; the seed data is those bonds' records and 30 days of quote history from prod. Expected values in the tests are the fixtures' values at the reference date.

**Refreshing** (when the source formats change, or the chosen bonds mature): `npx esrun scripts/capture-fixtures/capture-fixtures.ts` downloads the live sources, reads the bonds from prod (read only) and rewrites `tests/fixtures/`. Edit the bond lists at the top of the script first if needed. Then run the seed and the tests against `int` and update the expected values. The script checks that the trimmed files parse to the same bonds as the originals.

Live source changes are caught by the prod updater (its failure email) and later by a live source canary (README roadmap), not by `int`.

## Logging in

Integration and E2E tests log in as the test user `catalyst-viewer-test@albedoonline.com` (group `catalyst-viewer-test`, accepted only off prod); `sst shell` gives them `Resource.TestUser` and `Resource.TestUserPassword`. Both refuse to run against prod.

- Integration tests sign in with the plain-password flow (`USER_PASSWORD_AUTH`), which only the non-prod app clients allow, and call the API with the access token, like the site.
- E2E tests sign in once in `tests/e2e/global-setup.ts` (not traced) and reuse the session (`storageState`). Traces are kept for failed tests only, and the pipeline uploads Playwright results only on failure.

To run the E2E tests against a local site: `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000` (the test user still comes from the stage).

## Unit tests

Vitest, next to the code (`*.test.ts`); `npm test` runs all packages. Covered: the source parsers, the API access check, the handlers' request handling, the report email, job summaries, yield to maturity, the fundamental scorecard and formatting helpers.
