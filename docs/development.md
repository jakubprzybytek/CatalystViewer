# Development

This app is developed and delivered per the [sst-delivery standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/STANDARD.md): develop on `dev`, every push to `main` goes through `int` to `prod`. The standard has the general rules (stages, tests, the CD pipeline, versions, when a push needs a yes first, test users); this file holds what is specific to CatalystViewer and where it still deviates. Testing details (fixtures, reference date) are in [testing.md](testing.md); deploying from GitHub (OIDC role, policy) in [infra/github/README.md](../infra/github/README.md).

## Stages

| Stage | URL | Data |
|---|---|---|
| `dev` | https://dev.catalyst.albedoonline.com, or localhost with `npm run dev` | developer's choice |
| `int` | https://int.catalyst.albedoonline.com | a copy of live data from before the prod cutover (see deviations) |
| `prod` | https://catalyst.albedoonline.com | real data; the Bonds Updater schedule runs only here |

Stage flags (`isProd`, `scheduleEnabled`, `siteDomain`) are in `infra/stage.ts`. `prod` has `removal: retain` and `protect`.

**Auth:** the shared, manually managed Cognito pool `AlbedoUserPool` (`eu-west-1_IVai0KEAA`), users shared with other Albedo apps. Each stage has its own app client `catalyst-viewer-<stage>-web`, created by SST in `infra/api.ts`; the API authorizer accepts only its own stage's client. Every API handler (through `lambdaHandler` in `packages/functions/src/HandlerProxy.ts`) also requires a Cognito group: `catalyst-viewer` (real users) on every stage, `catalyst-viewer-test` (the test user) everywhere except prod (`accessGroups` in `infra/stage.ts`). Someone who should use the app is added to `catalyst-viewer` by hand.

**Test user:** `catalyst-viewer-test@albedoonline.com`, password in the SST secret `TestUserPassword` of `dev` and `int`; tests read both through `sst shell` (`Resource.TestUser`, `Resource.TestUserPassword`). Rotation: [the standard's test-user template](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/templates/test-user.md).

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
| Integration (API), E2E | not yet (see deviations) |
| Smoke (Playwright) | `npm run test:smoke:int` (int), `npm run test:smoke` (dev); run inside `sst shell`, as the test user |

## Delivery

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/cd.yml` | push to `main` (except `docs/**`, `**/*.md`), manual | checks → deploy int → smoke tests → tag `v1.N` → deploy prod from the tag → site and API answer (no login) |
| `.github/workflows/pr.yml` | pull request | checks |

- Rollback or redeploy: `gh workflow run cd.yml -f tag=v1.5` (also accepts the older `v1.0.0`–`v1.1.2` tags).
- Releases are `v1.N`, forward only. Until 2026-10-26 they were `vX.Y.Z` from conventional commits (`v1.0.0`–`v1.1.2`); `v1.2` was tagged on the commit prod ran then (`8a7b159`, same as `v1.1.2`), and `cd.yml` continues from there.
- `TAVILY_API_KEY` (web search for the AI steps) is a GitHub secret, passed to `sst deploy` as an environment variable.

Ask before pushing changes that touch data, resources holding data, access or cost ([the standard, section 5](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/STANDARD.md#5-when-a-push-needs-a-yes-first)). For this app that includes changes to the Bonds Updater schedule, the state machines, and the AI (Bedrock, Tavily) calls.

## Deviations

- **`int` is not yet a test stage.** It still has the live data copied before the prod cutover (2026-10-25), downloads from the live sources (GPW, obligacje.pl), and calls the real AI and email services when the updater is run by hand (it has no schedule). The pipeline's gate is the smoke tests. Ends when, as planned in [testing.md](testing.md):
  1. AI (Bedrock, Tavily) and email are stubbed on `int`;
  2. fixture mode and the reference date exist, and `cd.yml` reseeds `int` after each deploy;
  3. integration and E2E tests run in `cd.yml` (inside `sst shell`), replacing the smoke tests;
  4. the live data is cleared from the `int` tables.
- **Extra stages** `codespace` and `staralliancepirx` are still deployed (idle since mid-2026). Ends with `sst remove --stage codespace` and `sst remove --stage staralliancepirx`.
- **The version is not shown in the app.** `APP_VERSION` is passed to `sst deploy` but not used yet.
