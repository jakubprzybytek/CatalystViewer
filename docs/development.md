# Development

This app is developed and delivered per the [continuous-delivery standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/STANDARD.md): develop on `dev`, every push to `main` goes through `int` to `prod`. The standard has the general rules (stages, tests, the CD pipeline, versions, when a push needs a yes first, test users); this file holds what is specific to CatalystViewer and where it still deviates. Testing details (fixtures, reference date) are in [testing.md](testing.md); deploying from GitHub (OIDC role, policy) in [infra/github/README.md](../infra/github/README.md).

## Stages

| Stage | URL | Data |
|---|---|---|
| `dev` | https://dev.catalyst.albedoonline.com, or localhost with `npm run dev` | developer's choice |
| `int` | https://int.catalyst.albedoonline.com | fixtures, reset by the pipeline before the tests; fixture sources, fixed reference date ([testing.md](testing.md)) |
| `prod` | https://catalyst.albedoonline.com | real data; the Bonds Updater schedule runs only here |

Stage flags are in `infra/stage.ts`: `isProd`, `scheduleEnabled` (prod only), `useFixtures` and `referenceDate` (int), the AI and email stubs (every stage but prod), `siteDomain`. `prod` has `removal: retain` and `protect`.

**Auth:** the shared, manually managed Cognito pool `AlbedoUserPool` (`eu-west-1_IVai0KEAA`), users shared with other Albedo apps. Each stage has its own app client `catalyst-viewer-<stage>-web`, created by SST in `infra/api.ts`; the API authorizer accepts only its own stage's client. Every API handler (through `lambdaHandler` in `packages/functions/src/HandlerProxy.ts`) also requires a Cognito group: `catalyst-viewer` (real users) on every stage, `catalyst-viewer-test` (the test user) everywhere except prod (`accessGroups` in `infra/stage.ts`). Someone who should use the app is added to `catalyst-viewer` by hand.

**Test user:** `catalyst-viewer-test@albedoonline.com`, password in the SST secret `TestUserPassword` of `dev` and `int`; tests read both through `sst shell` (`Resource.TestUser`, `Resource.TestUserPassword`). Rotation: [the standard's test-user template](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/templates/test-user.md).

## Run locally

```sh
npm run dev -- --stage dev        # sst dev: Lambdas on your machine, Next.js dev server
npm run deploy -- --stage dev     # full deployment; use it in agent sessions
```

Stop `sst dev` when you're done: it holds `dev`'s lock and blocks every deploy to `dev`.

## Tests

| Kind | Command |
|---|---|
| Type check | `npm run typecheck` (infra and all packages) |
| Unit (Vitest) | `npm test` |
| Seed a test stage | `npx sst shell --stage int -- npm run seed` (int or dev) |
| Integration (API) | `npx sst shell --stage int -- npm run test:integration` |
| E2E (Playwright) | `npx sst shell --stage int -- npm run test:e2e` |

Integration and E2E tests expect the seeded fixtures and log in as the test user; details in [testing.md](testing.md).

## Testing the AI features locally

The two AI features, **issuer classification** (industry, summary, website) and **fundamental analysis** (financials and scorecard), run on Bedrock and Tavily only on `prod`; on `dev` and `int` they're stubbed (`AI_MODE=stub`, [testing.md](testing.md)). Deploying a change to them therefore shows nothing. Run them on your machine instead:

```sh
npm run classify-issuer -- "Kruk S.A."
npm run analyze-issuer -- "Dadelo S.A."
npm run analyze-issuer -- "Dadelo S.A." --model haiku_4.5 --out before.json
```

| Option | Meaning |
|---|---|
| `--model haiku_4.5` / `sonnet_4.6` / `sonnet_5.5` | model for the analysis (default: `DEFAULT_MODEL_ALIAS` in `packages/core/src/ai/models.ts`, now `sonnet_4.6`, the same as on prod; `sonnet_5.5` is listed but not yet enabled for the AWS account); classification always uses the default |
| `--out <file.json>` | save the full result: the fields the app stores as the `#ANALYSIS` record (financials, scorecard, agent log, report) |

**Same code as the app.** The CLI (`packages/core/src/ai/issuers/cli.ts`) and the Lambdas (`packages/functions/src/issuers/classifyIssuer.ts`, `analyzeIssuer.ts`) call the same entry points, `runClassification` and `runAnalysis` in `packages/core/src/ai/issuers/IssuerAI.ts`. Prompts, tools (Stockwatch, Biznesradar, web search), parsing, scorecard and report are shared. Only the edges differ: the CLI prints the result and stores nothing, while the Lambdas write it to the `IssuerProfiles` table. Keep it that way: a new AI feature, or a new step in one of these, goes behind `IssuerAI.ts` so it can be run locally too.

**What it needs:**
- AWS credentials for the app's account with `bedrock:InvokeModel` (the model ARNs in `packages/core/src/ai/models.ts` are inference profiles in that account, `eu-west-1`; the region defaults to `eu-west-1` when `AWS_REGION` isn't set);
- `TAVILY_API_KEY` (from https://app.tavily.com; the GitHub secret of the same name can't be read back) in `.env.local` at the repo root (git-ignored; template: `.env.local.example`) or exported in the shell, which wins over the file. The npm scripts load the file with Node's `--env-file-if-exists`. Without the key the command stops before any paid call.

**Cost.** Without `AI_MODE=stub`, every run is a real, paid call to Bedrock and Tavily. An analysis is an agent loop of up to 10 model calls, plus tool calls. The command prints the tokens used at the end. Use `--model haiku_4.5` while iterating on plumbing, and Sonnet to judge the result.

**Free dry run.** `AI_MODE=stub npm run analyze-issuer -- "X"` goes through the same entry point with the stub answers. That's useful for checking the CLI and the scorecard and report formatting without paying.

**Feedback loop for a change to the AI features:**

1. Pick one or two issuers that show the problem (e.g. Dadelo, whose Stockwatch page had a part-year 2026) and save a baseline: `npm run analyze-issuer -- "Dadelo S.A." --out before.json` (on the unchanged code).
2. Change the code. Cover the deterministic parts with unit tests (parsers such as `StockwatchTool.test.ts`, scorecard rules in `scorecard.test.ts`, `npm test`).
3. Run again with `--out after.json` and compare, e.g. `diff <(jq .agentFinancials before.json) <(jq .agentFinancials after.json)` and the same for `.scorecard`.
4. Push to `main` (AI changes need a yes first, see [Delivery](#delivery)). `int` runs only the stubs, so the local run in step 3 is the check of the real AI behaviour.

Changes to the scorecard rules alone don't need a new analysis: the issuer list recomputes scorecards from the stored figures (`currentScorecard` in `packages/functions/src/issuers/getIssuerProfiles.ts`).

The CLI runs through `esrun --send-code-mode=temporaryFile` (see `package.json`): the bundled code is too large to pass on the command line (`spawn E2BIG`).

## Delivery

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/continuous-delivery.yaml` | push to `main` (except `docs/**`, `**/*.md`), manual | checks → deploy int → seed → integration and E2E tests → tag `v1.N` → deploy prod from the tag → site and API answer (no login) |
| `.github/workflows/pull-request-checks.yaml` | pull request (Dependabot's too) | typecheck, unit tests, site build; no AWS access |
| `.github/dependabot.yml` | weekly (npm), monthly (actions) | version update PRs; security update PRs come from the repo setting ([dependabot standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/dependabot/STANDARD.md)) |

- Rollback or redeploy: run Continuous Delivery manually from the release tag ("Use workflow from"; `gh workflow run continuous-delivery.yaml --ref v1.6`). It deploys the tag to int, seeds it, runs the tests, then deploys it to prod, without a new version. Works for `v1.5` and later; `v1.0.0`–`v1.4` predate `continuous-delivery.yaml` and can't be rolled back this way.
- Releases are `v1.N`, forward only, shown in the app's menu (top right, "Version …"; `local` for a deploy from a machine). Until 2026-10-26 they were `vX.Y.Z` from conventional commits (`v1.0.0`–`v1.1.2`); `v1.2` was tagged on the commit prod ran then (`8a7b159`, same as `v1.1.2`), and `continuous-delivery.yaml` continues from there.
- `TAVILY_API_KEY` (web search for the AI steps) is a GitHub secret, passed to `sst deploy` as an environment variable.

Ask before pushing changes that touch data, resources holding data, access or cost ([the standard, section 5](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/STANDARD.md#5-when-a-push-needs-a-yes-first)). For this app that includes changes to the Bonds Updater schedule, the state machines, and the AI (Bedrock, Tavily) calls.

## Deviations

- **Deploying from Windows needs Developer Mode and an extra build step.** Next.js links some packages in the build (e.g. `.next/node_modules/aws-amplify-<hash>`) with symlinks; Windows creates them only with Developer Mode on, and they point to the absolute `D:\…` path, which doesn't exist on Lambda. On Windows, `infra/web.ts` runs `scripts/site-build/windows-links.mjs` after the OpenNext build to replace them with copies; builds on Linux (CI) are unchanged. OpenNext also fails to install the image optimizer's dependencies on Windows; the app doesn't use `next/image`, so it has no effect. Ends when OpenNext/Next.js handle these on Windows.
- **Workflows run on `ubuntu-24.04`, not `ubuntu-latest`.** GitHub moved `ubuntu-latest` to Ubuntu 26.04 in October 2026, and Playwright 1.60 can't install Chromium there (`Playwright does not support chromium on ubuntu26.04-x64`). Ends when Playwright is upgraded to a version that supports 26.04 and the E2E tests pass on it.
