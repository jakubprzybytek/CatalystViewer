# Software Development Life Cycle

How CatalystViewer got to continuous delivery: the **desired setup** for this app and the **migration plan**. The general rules (stages, tests, pipeline, versions, test users) are the [sst-delivery standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/STANDARD.md); how to develop and ship today, and where the app still deviates, is in [development.md](development.md).

Testing details (fixtures, reference date, test layers) are in [testing.md](testing.md).

---

## Current state (as of 2026-10-24)

| | |
|---|---|
| Stages | `int` is the only live stage and acts as production. `dev`, `codespace`, `staralliancepirx` exist in AWS but are idle (last deployed May–June 2026, never ran the updater). |
| Workflow | `.github/workflows/delivery.yml` (formerly `ci-int.yml`): on push to `main` → unit tests → deploy `int` → smoke tests. |
| Releases | No versions or tags. Every merge to `main` goes straight to the live stage. |
| PRs | No checks run on pull requests. `main` is not protected. |
| Auth | Shared Cognito pool `AlbedoUserPool` (`eu-west-1_IVai0KEAA`). All stages use the same generic client `Albedo2Webapp`, hardcoded in `infra/api.ts`. |
| Data | Live data (bonds, quotes history, issuer profiles, user profiles, jobs) lives in `int` tables. `removal` is `remove` for every stage except one named `production` (which doesn't exist), so removing `int` would delete the live data. |
| Domain | `int.catalyst.albedoonline.com`. |
| AWS access from CI | Long-lived access keys in GitHub secrets (most likely IAM user `GitHubActionsUser`) — replaced by the OIDC role in phase 0. The account already has a GitHub OIDC provider and OIDC roles for other repos, but none for CatalystViewer. |

---

## Desired setup

### Pipeline and versions

Per the standard; the workflows as built and the remaining deviations are in [development.md](development.md#delivery).

### Stages

| | `prod` | `int` | personal dev stages |
|---|---|---|---|
| Purpose | Live app for users | Release gate: deterministic tests | Local development (`sst dev`) |
| Deployed by | Pipeline, from a tag | Pipeline, from `main` | Developer |
| Domain | `catalyst.albedoonline.com` | `int.catalyst.albedoonline.com` | none (localhost) |
| Data | Live, kept forever | Fixture snapshot, reseeded on every deploy | Developer's choice |
| Sources (GPW, obligacje.pl) | Live | Fixture files (see testing.md) | Live or fixture |
| Clock | Real time | Fixed reference date | Real time |
| Bonds Updater schedule | On (weekdays 9:00, 12:00, 15:00 UTC) | Off (since phase 2); later run once by the pipeline after seeding | Off |
| AI (Bedrock, Tavily) | On | Stubbed | Stubbed by default |
| Emails (SES) | Sent to recipients | Logged only | Logged only |
| `removal` / protection | `retain` + `protect` | `remove` | `remove` |
| DynamoDB backups | Point-in-time recovery (SST default) | Point-in-time recovery (SST default) | Point-in-time recovery (SST default) |
| Cognito client | `catalyst-viewer-prod-web` | `catalyst-viewer-int-web` | `catalyst-viewer-<stage>-web` |

Stage-specific behaviour is chosen in one place (an `infra/stage.ts` config: `isProd`, `useFixtures`, `scheduleEnabled`, …), not by scattered `$app.stage === ...` checks.

### Auth

- Keep the shared, manually managed pool `AlbedoUserPool`. Users are shared across Albedo apps, so prod users need no migration.
- Each stage gets its **own app client**, created by SST (`aws.cognito.UserPoolClient` on the existing pool id), named `catalyst-viewer-<stage>-web`, same auth flows as today (SRP, refresh, custom), no secret. This matches the portfolio-tracker convention.
- The API authorizer accepts only its own stage's client id, so an `int` token can't call the prod API.
- The pool id stays a constant; the client id comes from the SST resource, not a hardcoded value.
- `Albedo2Webapp` is left untouched (it may be used elsewhere) — Catalyst just stops using it.
- Test account: the dedicated user `catalyst-viewer-test@albedoonline.com` in a test-only group, password as an SST secret (the standard's test users; phase 6).

### GitHub setup

**AWS access via OIDC**, no access keys: the workflows assume the role `GitHub-CatalystViewer` (policies `SST-Deployment` + `CatalystViewer-Deployment`), following the [aws-github-deploy standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/aws-github-deploy/STANDARD.md). The role, its policy and how to change them are described in [`infra/github/README.md`](../infra/github/README.md); the policy is [`infra/github/deploy-policy.json`](../infra/github/deploy-policy.json). The role ARN is built from the repository secret `AWS_ACCOUNT_ID`, the region comes from the variable `AWS_REGION`.

**Secrets and variables** stay at repository level (test user, Tavily key).

**GitHub environments** are not used (the standard has no environments or branch rules): any branch or tag of this repo can assume the role, and only the deploy jobs get an OIDC token. Pull request jobs never do.

**No branch protection on `main`**: changes are pushed directly to `main`; the delivery pipeline is the gate. `pr.yml` still runs checks if a pull request is opened.

### Monitoring prod

- Bonds Updater failure email (exists today) — now sent only from prod.
- Live source canary: a scheduled check that downloads the real GPW / obligacje.pl files and runs the parsers, alerting on format changes (see testing.md). Since `int` no longer touches live sites, this and the prod updater are the only things that catch source changes.

---

## Decisions

| # | Decision | Outcome |
|---|---|---|
| 1 | Manual approval before prod deploy? | No — fully automatic. A GitHub environment rule can be added later if needed. |
| 2 | Version bump rule | ~~Conventional commits~~ Superseded by the standard: releases only go forward (`v1.N` + 1; phase 6). |
| 3 | What `int` tests until fixture mode exists | Smoke tests only, against whatever data `int` has (interim until migration phase 4). |
| 4 | Copy `Jobs` history to prod? | No. Prod starts with an empty jobs log. |
| 5 | Old stages | Remove `codespace` and `staralliancepirx`. Keep `dev` as the personal development stage. |
| 6 | Email recipients | Same SSM parameter for prod; `int` doesn't send. |
| 7 | Copy prod data back to `int`/dev? | No — `int` uses fixtures only. |
| 8 | Branch protection / required PRs on `main`? | No. Direct pushes to `main`; the pipeline is the gate. |

## Migration plan

Each phase is shippable on its own; the app keeps working after every one.

### Phase 0 — Preparation (no user-visible change)

1. ✅ `infra/stage.ts` holds the stage flags (`isProd`, `scheduleEnabled`, `siteDomain`). `sst.config.ts` uses `prod` (not `production`) for `removal: retain`, plus `protect` for prod.
2. ✅ Web domain: `catalyst.albedoonline.com` for `prod`, `<stage>.catalyst.albedoonline.com` otherwise.
3. ✅ Per-stage Cognito app client `catalyst-viewer-<stage>-web`, created by SST on the shared pool; its id feeds the API authorizer and the web app. Same auth flows and token lifetimes as `Albedo2Webapp`.
4. ✅ Point-in-time recovery: nothing to do. SST enables it on every table by default (all `int` tables have it).
5. ✅ The Bonds Updater schedule follows `scheduleEnabled` (only `int` for now, see phase 2).
6. ✅ `GitHub-CatalystViewer` OIDC role and policy ([GitHub setup](#github-setup)); workflows use `role-to-assume`. No access keys in the repo.

Deploying this to `int` gives `int` its own client `catalyst-viewer-int-web`. Users just log in again (same accounts).

### Phase 1 — Create prod (parallel run)

1. ✅ Deployed `prod` with the manual **Deploy Prod** workflow (`deploy-prod.yml`) from `main`, with the "Data is displayed" smoke test skipped (prod starts empty). The zone still had the ACM validation CNAME from an earlier deployment of the bare domain, so prod's DNS uses `override: true` to take it over.
2. ✅ `catalyst.albedoonline.com` is up; Cognito client `catalyst-viewer-prod-web`; login works (smoke tests).
3. ✅ Prod's schedule is **not** enabled (`prod` is not in `SCHEDULED_STAGES` in `infra/stage.ts`), so the updater doesn't double-run.

### Phase 2 — Data copy and cutover

1. ✅ No writes to `int` during the copy: done on Sunday 2026-10-25 (the schedule only runs on weekdays) with no executions running.
2. ✅ Copied with [`scripts/copy-stage-data`](../scripts/copy-stage-data/README.md) (`--from int --to prod --live`): `Profiles` 1, `BondDetails` 1617, `BondStatistics` 13453, `IssuerProfiles` 258 items. `Jobs` (history) and `SiteRevalidation` are not copied.
3. ✅ Exact item counts match per table; sampled items are identical in both stages.
4. ✅ Schedule moved to prod (`SCHEDULED_STAGES = ["prod"]` in `infra/stage.ts`); `int` has no schedule. A manual Bonds Updater run on prod succeeded on 2026-10-25 (1051 bonds updated, 1 new).
5. Tell users the new address (no banner on `int`).
6. ✅ Tagged `v1.0.0` on `5d6708d`, the commit deployed to prod.

### Phase 3 — Pipeline

1. ✅ `delivery.yml` runs the full chain (checks → int → smoke → tag → prod → smoke), built from the reusable `checks.yml` and `deploy-stage.yml`. `deploy-prod.yml` deploys a given tag.
2. ✅ PR workflow `pr.yml` (unit tests + typecheck). No branch protection (decision 8).
3. ✅ Removed the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` repo secrets on 2026-10-26. Remaining secrets: `AWS_ACCOUNT_ID`, `TAVILY_API_KEY`, `TEST_PASSWORD`.
4. ✅ First pipeline release `v1.0.1` on 2026-10-25 (checks → int → tag → prod, ~6 min). `deploy-prod.yml` tested by redeploying `v1.0.1`; a non-existent tag is rejected before deploying.

### Phase 4 — `int` becomes the test environment

1. Remove the `int` schedule permanently (`scheduleEnabled: false`), stub AI and email on `int`.
2. Implement fixture mode and the reference date as described in [testing.md](testing.md); pipeline seeds `int` after each deploy.
3. Add integration and E2E tests to the pipeline gate.
4. Clear the live data from `int` tables (it's now in prod).

Until this phase is done, the `int` gate is smoke tests on top of whatever data `int` has.

### Phase 5 — Cleanup

1. Remove the idle stages: `sst remove --stage codespace` and `sst remove --stage staralliancepirx`. `dev` stays.
2. Add the live source canary on prod.
3. Update `README.md` and `docs/testing.md` to match.

### Phase 6 — Align with the sst-delivery standard

1. One `cd.yml` from the [template](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/sst-delivery/templates/cd.yml), replacing `delivery.yml`, `deploy-prod.yml`, `deploy-stage.yml` and `checks.yml` (`pr.yml` may stay).
2. Forward-only versions: tag the commit currently on prod `v1.N` (the latest `v1.0.x` patch number + 1) before the first run, then `v1.N` + 1 per release.
3. Test user `catalyst-viewer-test@albedoonline.com` (group `catalyst-viewer-test`, accepted off prod only; the API checks the group); password as the SST secret `TestUserPassword` of `dev` and `int`; tests read it through `sst shell`. Then delete the `TEST_PASSWORD` secret and the `TEST_USERNAME` variable, and change the password of the account used until now.
4. No logged-in tests on prod: after the prod deploy, only checks that need no login. Upload Playwright reports only on failure.

### Risks

| Risk | Mitigation |
|---|---|
| Data written to `int` after the copy is lost | Disable the `int` schedule before copying; copy is fast (~minutes). |
| Users can't log in after client switch | Same pool, same accounts — only a re-login. Verify with the test account first. |
| Prod accidentally removed | `removal: retain` + `protect` on prod, PITR on tables. |
| Pipeline tags but prod deploy fails | Tag marks "passed int"; rerun the prod job or use `deploy-prod.yml`. Prod keeps the previous version until then. |
