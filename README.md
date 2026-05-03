### Development

#### SST
```
npm run dev
```

#### Next.js web app:
```
cd packages/web
npm run dev
```

### Catalyst CLI
* `npm run quote -- FPC0631` - Get a quote for a bond
* `npm run classify-issuer -- "Kruk S.A."` - Classify an issuer using AI (displays result)

### Bonds Update Workflow

The bonds update workflow is an AWS Step Functions state machine (`BondsUpdaterStateMachine`) that runs on a schedule (weekdays at 09:00, 12:00, and 15:00 UTC). It can also be triggered manually via the AWS console or CLI with the following JSON input:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `updateBonds` | boolean | `true` | Whether to fetch and update bond data. Set to `false` to skip bond update and run issuer classification only. |
| `classificationsCap` | number | `20` | Maximum number of unclassified issuers to classify in one run. Ignored when `forceClassification` is `true`. |
| `forceClassification` | boolean | `false` | When `true`, disables `classificationsCap` and re-classifies **all** issuers (including already-classified ones). |

**Example** – skip bond update and force re-classification of all issuers with no cap:
```json
{
  "updateBonds": false,
  "forceClassification": true
}
```

### Testing

See [docs/testing.md](docs/testing.md) for full details on our testing setup.

#### Unit Tests

Preparation:
- No additional setup required beyond `npm install`.

Run:
```bash
npm run test
```

#### Smoke Tests

Preparation:
1. Install Playwright browser binaries (first time only):
```bash
npx playwright install chromium
```
2. Copy `.env.local.example` to `.env.local` and fill in smoke-test credentials.

Run (local/custom URL):
```bash
npm run test:smoke
```

Run (integration `int` environment):
```bash
npm run test:smoke:int
```
