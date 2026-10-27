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

## Delivery

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/continuous-delivery.yaml` | push to `main` (except `docs/**`, `**/*.md`), manual | checks → deploy int → seed → integration and E2E tests → tag `v1.N` → deploy prod from the tag → site and API answer (no login) |
| `.github/workflows/pr.yml` | pull request | checks |

- Rollback or redeploy: run Continuous Delivery manually from the release tag ("Use workflow from"; `gh workflow run continuous-delivery.yaml --ref v1.6`). It deploys the tag to int, seeds it, runs the tests, then deploys it to prod, without a new version. Works for `v1.5` and later; `v1.0.0`–`v1.4` predate `continuous-delivery.yaml` and can't be rolled back this way.
- Releases are `v1.N`, forward only, shown in the app's menu (top right, "Version …"; `local` for a deploy from a machine). Until 2026-10-26 they were `vX.Y.Z` from conventional commits (`v1.0.0`–`v1.1.2`); `v1.2` was tagged on the commit prod ran then (`8a7b159`, same as `v1.1.2`), and `continuous-delivery.yaml` continues from there.
- `TAVILY_API_KEY` (web search for the AI steps) is a GitHub secret, passed to `sst deploy` as an environment variable.

Ask before pushing changes that touch data, resources holding data, access or cost ([the standard, section 5](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/STANDARD.md#5-when-a-push-needs-a-yes-first)). For this app that includes changes to the Bonds Updater schedule, the state machines, and the AI (Bedrock, Tavily) calls.

## Deviations

- **No working site from a Windows deploy.** `npm run deploy` from Windows builds the site, but the deployed site fails (500): Next.js links some packages (e.g. `aws-amplify-<hash>`) with symlinks to the absolute `D:\…` path, which don't exist on Lambda. The API, Lambdas and workflows deploy fine. On Windows, use `npm run dev -- --stage dev` for the site, or deploy dev from Linux (WSL, a codespace). Ends when OpenNext/Next.js package these links on Windows.
