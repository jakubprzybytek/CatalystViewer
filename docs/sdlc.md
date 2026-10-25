# Software Development Life Cycle

How code gets from a commit to production. This document describes the **desired setup** and the **migration plan** from the current one.

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

### Pipeline

```
pull request
  └─ unit tests + typecheck                          (required check)

merge to main
  └─ unit tests
     └─ deploy int
        └─ integration tests + E2E tests against int
           └─ create tag vX.Y.Z
              └─ deploy prod from the tag
                 └─ smoke tests against prod

manual: "Deploy tag to prod" (rollback / redeploy any existing tag)
```

- One workflow (`.github/workflows/delivery.yml`) runs the whole chain as dependent jobs. The prod job checks out the tag created by the previous job.
  - Reason: a tag pushed by CI with the default `GITHUB_TOKEN` does not trigger other workflows, so a separate `on: push: tags` workflow would never start.
- Runs are queued, never cancelled (`concurrency: delivery`, `cancel-in-progress: false`), so `int` is never shared between two runs and prod deploys stay in order.
- If any step before tagging fails, nothing reaches prod. `int` stays on the failing version until the next merge fixes it.
- A separate manual workflow (`deploy-prod.yml`, `workflow_dispatch` with a `tag` input) deploys any existing tag to prod. This is the rollback path.

### Versioning

- Semantic versions as git tags only: `v1.0.0`, `v1.0.1`, … No version commits to `main`; `package.json` version stays unused.
- Next version is computed from the latest tag and the commit messages since it (conventional commits):
  - `feat:` → minor, `!` / `BREAKING CHANGE` → major, anything else → patch.
- A GitHub Release is created for each tag with the commit list as notes.
- First tag: `v1.0.0` at the moment prod goes live.

### Stages

| | `prod` | `int` | personal dev stages |
|---|---|---|---|
| Purpose | Live app for users | Release gate: deterministic tests | Local development (`sst dev`) |
| Deployed by | Pipeline, from a tag | Pipeline, from `main` | Developer |
| Domain | `catalyst.albedoonline.com` | `int.catalyst.albedoonline.com` | none (localhost) |
| Data | Live, kept forever | Fixture snapshot, reseeded on every deploy | Developer's choice |
| Sources (GPW, obligacje.pl) | Live | Fixture files (see testing.md) | Live or fixture |
| Clock | Real time | Fixed reference date | Real time |
| Bonds Updater schedule | On (weekdays 9:00, 12:00, 15:00 UTC) | Off; run once by the pipeline after seeding | Off |
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
- Test account: one dedicated user in the pool (credentials in repository secrets) used by E2E and smoke tests.

### GitHub setup

**AWS access via OIDC** instead of long-lived access keys:

- The account already has the GitHub OIDC provider (`token.actions.githubusercontent.com`) and per-repo roles for other apps (`GitHub-PortfolioTracker`, `GitHub-AstroWeather`, …), each with the shared `SST-Deployment` policy plus an app-specific `<App>-Deployment` policy.
- CatalystViewer gets the same: role `GitHub-CatalystViewer` with `SST-Deployment` + `CatalystViewer-Deployment`. Definitions are in the repo:
  - [`infra/iam/github-oidc-trust.json`](../infra/iam/github-oidc-trust.json) — only this repo's `main` branch and `v*` tags can assume the role.
  - [`infra/iam/catalyst-viewer-deployment-policy.json`](../infra/iam/catalyst-viewer-deployment-policy.json) — modelled on `PortfolioTracker-Deployment`, plus Step Functions and the `catalyst-viewer/*` SSM parameters.
- They are created by hand (CI runs with this role, so it can't create it):

  ```bash
  aws iam create-policy --policy-name CatalystViewer-Deployment \
    --policy-document file://infra/iam/catalyst-viewer-deployment-policy.json
  aws iam create-role --role-name GitHub-CatalystViewer \
    --assume-role-policy-document file://infra/iam/github-oidc-trust.json
  aws iam attach-role-policy --role-name GitHub-CatalystViewer \
    --policy-arn arn:aws:iam::198805281865:policy/SST-Deployment
  aws iam attach-role-policy --role-name GitHub-CatalystViewer \
    --policy-arn arn:aws:iam::198805281865:policy/CatalystViewer-Deployment
  ```

  To change permissions later, edit the JSON and run
  `aws iam create-policy-version --policy-arn arn:aws:iam::198805281865:policy/CatalystViewer-Deployment --policy-document file://infra/iam/catalyst-viewer-deployment-policy.json --set-as-default`.
- Workflows use `aws-actions/configure-aws-credentials` with `role-to-assume: arn:aws:iam::198805281865:role/GitHub-CatalystViewer` and `permissions: id-token: write`.
- Once it works, delete the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` repo secrets. Only deactivate the `GitHubActionsUser` keys after checking no other repo uses them (that user is in the `Administrators` group).

**Secrets and variables** stay at repository level (test user, Tavily key).

**GitHub environments** (`int`, `prod`) are deferred. They would add per-stage secrets, scoping the AWS role to an environment instead of a branch/tag, deployment rules (e.g. prod only from `v*` tags, optional approval) and a deployment history view. They can be added later without changing the pipeline shape.

**Branch protection on `main`**: PR required, "unit tests + typecheck" check required.

### Monitoring prod

- Bonds Updater failure email (exists today) — now sent only from prod.
- Live source canary: a scheduled check that downloads the real GPW / obligacje.pl files and runs the parsers, alerting on format changes (see testing.md). Since `int` no longer touches live sites, this and the prod updater are the only things that catch source changes.

---

## Decisions

| # | Decision | Outcome |
|---|---|---|
| 1 | Manual approval before prod deploy? | No — fully automatic. A GitHub environment rule can be added later if needed. |
| 2 | Version bump rule | Conventional commits (`feat:` minor, `!` major, else patch). |
| 3 | What `int` tests until fixture mode exists | Smoke tests only, against whatever data `int` has (interim until migration phase 4). |
| 4 | Copy `Jobs` history to prod? | No. Prod starts with an empty jobs log. |
| 5 | Old stages | Remove `codespace` and `staralliancepirx`. Keep `dev` as the personal development stage. |
| 6 | Email recipients | Same SSM parameter for prod; `int` doesn't send. |
| 7 | Copy prod data back to `int`/dev? | No — `int` uses fixtures only. |

## Migration plan

Each phase is shippable on its own; the app keeps working after every one.

### Phase 0 — Preparation (no user-visible change)

1. ✅ `infra/stage.ts` holds the stage flags (`isProd`, `scheduleEnabled`, `siteDomain`). `sst.config.ts` uses `prod` (not `production`) for `removal: retain`, plus `protect` for prod.
2. ✅ Web domain: `catalyst.albedoonline.com` for `prod`, `<stage>.catalyst.albedoonline.com` otherwise.
3. ✅ Per-stage Cognito app client `catalyst-viewer-<stage>-web`, created by SST on the shared pool; its id feeds the API authorizer and the web app. Same auth flows and token lifetimes as `Albedo2Webapp`.
4. ✅ Point-in-time recovery: nothing to do. SST enables it on every table by default (all `int` tables have it).
5. ✅ The Bonds Updater schedule follows `scheduleEnabled` (only `int` for now, see phase 2).
6. ✅ `GitHub-CatalystViewer` OIDC role and policy created (commands in [GitHub setup](#github-setup)); workflows use `role-to-assume`. The access key secrets are still in the repo until the pipeline is replaced (phase 3).

Deploying this to `int` gives `int` its own client `catalyst-viewer-int-web`. Users just log in again (same accounts).

### Phase 1 — Create prod (parallel run)

1. ✅ Deployed `prod` with the manual **Deploy Prod** workflow (`deploy-prod.yml`) from `main`, with the "Data is displayed" smoke test skipped (prod starts empty). The zone still had the ACM validation CNAME from an earlier deployment of the bare domain, so prod's DNS uses `override: true` to take it over.
2. ✅ `catalyst.albedoonline.com` is up; Cognito client `catalyst-viewer-prod-web`; login works (smoke tests).
3. ✅ Prod's schedule is **not** enabled (`prod` is not in `SCHEDULED_STAGES` in `infra/stage.ts`), so the updater doesn't double-run.

### Phase 2 — Data copy and cutover

1. ✅ No writes to `int` during the copy: done on Sunday 2026-10-25 (the schedule only runs on weekdays) with no executions running.
2. ✅ Copied with [`scripts/copy-stage-data`](../scripts/copy-stage-data/README.md) (`--from int --to prod --live`): `Profiles` 1, `BondDetails` 1617, `BondStatistics` 13453, `IssuerProfiles` 258 items. `Jobs` (history) and `SiteRevalidation` are not copied.
3. ✅ Exact item counts match per table; sampled items are identical in both stages.
4. Move the schedule to prod (`SCHEDULED_STAGES = ["prod"]` in `infra/stage.ts`); trigger one Bonds Updater run on prod and confirm it succeeds.
5. Tell users the new address. Optionally point `int.catalyst.albedoonline.com` users to it (a banner) until phase 4.
6. Tag the commit deployed to prod as `v1.0.0`.

### Phase 3 — Pipeline

1. Extend `delivery.yml` to the full chain (unit tests → int → tests → tag → prod → smoke). `deploy-prod.yml` (manual deploy) already exists from phase 1.
2. Add the PR workflow (unit tests + typecheck) and turn on branch protection for `main`.
3. Remove the AWS access key secrets from the repo (workflows use the OIDC role since phase 0).
4. Do one test release end to end (a trivial `fix:` commit) and one rollback via `deploy-prod.yml`.

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

### Risks

| Risk | Mitigation |
|---|---|
| Data written to `int` after the copy is lost | Disable the `int` schedule before copying; copy is fast (~minutes). |
| Users can't log in after client switch | Same pool, same accounts — only a re-login. Verify with the test account first. |
| Prod accidentally removed | `removal: retain` + `protect` on prod, PITR on tables. |
| Pipeline tags but prod deploy fails | Tag marks "passed int"; rerun the prod job or use `deploy-prod.yml`. Prod keeps the previous version until then. |
