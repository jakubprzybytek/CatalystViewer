# Development

This app is developed and delivered per the [sst-delivery standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/STANDARD.md): develop on `dev`, every push to `main` goes through `int` to `prod`. The standard has the general rules (stages, tests, the CD pipeline, versions, when a push needs a yes first, test users); this file holds what is specific to CatalystViewer. How the app got here, and what is still planned, is in [sdlc.md](sdlc.md); testing details (fixtures, reference date) in [testing.md](testing.md).

## Stages

| Stage | URL | Data |
|---|---|---|
| `dev` | https://dev.catalyst.albedoonline.com, or localhost with `npm run dev` | developer's choice |
| `int` | https://int.catalyst.albedoonline.com | whatever `int` has (fixtures from [sdlc.md](sdlc.md) phase 4) |
| `prod` | https://catalyst.albedoonline.com | real data; the Bonds Updater schedule runs only here |

Stage flags (`isProd`, `scheduleEnabled`, `siteDomain`) are in `infra/stage.ts`.

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
| Integration (API) | not yet: planned in [testing.md](testing.md), [sdlc.md](sdlc.md) phase 4 |
| Smoke (Playwright) | `npm run test:smoke:int`; locally `npm run test:smoke` with `.env.local` |

## Delivery

Workflows in `.github/workflows/`:

| File | Trigger | What it does |
|---|---|---|
| `delivery.yml` | push to `main` (except `docs/**`, `**/*.md`), manual | checks → deploy int + smoke tests → tag → deploy prod from the tag + smoke tests |
| `deploy-prod.yml` | manual, `tag` input | deploy an existing tag to prod (rollback / redeploy) |
| `pr.yml` | pull request | checks |
| `checks.yml` | reused | unit tests and typecheck |
| `deploy-stage.yml` | reused | deploy one stage via the OIDC role, then its smoke tests |

Each stage deploy has its own lock (`deploy-int`, `deploy-prod`), so a manual prod deploy can't overlap with the pipeline's.

Ask before pushing changes that touch data, resources holding data, access or cost ([the standard, section 5](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/STANDARD.md#5-when-a-push-needs-a-yes-first)). For this app that includes changes to the Bonds Updater schedule, the state machines, and the AI (Bedrock, Tavily) calls.

## Deviations

Until the app is aligned with the standard ([sdlc.md](sdlc.md), phase 6):

- **Five workflow files** instead of one `cd.yml`.
- **Versions** are `vX.Y.Z` from conventional commits. Next: continue as `v1.N`, forward only.
- **The `int` gate is smoke tests only**: integration and E2E tests on fixtures come with phase 4.
- **Test login:** the smoke tests log in as a real account through the GitHub secret `TEST_PASSWORD` and the variable `TEST_USERNAME`, and they also run logged in against prod. Target: the test user `catalyst-viewer-test@albedoonline.com` with its password as an SST secret, and no logged-in tests on prod.
