# CatalystViewer — Copilot Instructions

Project-wide conventions for AI agents working in this repository.

## Secrets Management

Secrets are managed in **two ways** depending on environment:

### Local development
- Secrets are defined in `.env.local` (git-ignored, never committed).
- `.env.local.example` documents every secret with a placeholder value and a comment explaining where to get it. **Always update `.env.local.example` when adding a new secret.**
- Scripts under `scripts/` load `.env.local` via `dotenv` at startup.

### Deployed environments (GitHub Actions)
- Secrets are stored as **GitHub repository secrets** (Settings → Secrets and variables → Actions).
- The CI workflow (`ci-int.yml`) injects them as environment variables on the deploy step:
  ```yaml
  - name: Run Serverless Stack deploy
    run: npm run deploy -- --stage ${STAGE}
    env:
      MY_SECRET: ${{ secrets.MY_SECRET }}
  ```
- Lambda functions receive secrets as environment variables via the SST `environment:` block in `infra/`:
  ```ts
  environment: {
    MY_SECRET: process.env.MY_SECRET ?? "",
  }
  ```
- Lambda code reads them from `process.env.MY_SECRET`.

### Do NOT use
- `sst.Secret` / `Resource.<SecretName>.value` — not used in this project.
- Hard-coded secrets anywhere in source code.

### Checklist when adding a new secret
1. Add to `.env.local.example` with a placeholder and comment.
2. Add to the Lambda's `environment:` block in the relevant `infra/*.ts` file.
3. Add to the `sst deploy` step env in `.github/workflows/ci-int.yml`.
4. Document in the GitHub repo secrets (Settings → Secrets) — add a note in the PR description.

## Package Structure

- `packages/core` — all business logic and storage classes. Lambda handlers must NOT contain business logic.
- `packages/functions` — thin Lambda handlers that orchestrate calls to `@core/*`.
- `packages/web` — Next.js frontend.
- `scripts/` — standalone one-off or developer utility scripts. Each script lives in its own folder.

## AI / Agent Code

- Agent loop and tool interfaces live in `packages/core/src/ai/agent/`.
- Reusable tools (web search, etc.) live in `packages/core/src/ai/tools/`.
- Domain-specific AI operations (e.g. issuer classification) live in `packages/core/src/ai/<domain>/`.
