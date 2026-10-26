### Development

#### Local environment
```
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
| `classificationsCap` | number | `10` | Maximum number of unclassified issuers to classify in one run. Ignored when `forceClassification` is `true`. |
| `forceClassification` | boolean | `false` | When `true`, disables `classificationsCap` and re-classifies **all** issuers (including already-classified ones). |

**Example** – skip bond update and force re-classification of all issuers with no cap:
```json
{
  "updateBonds": false,
  "forceClassification": true
}
```

### Fundamental Analysis Workflow

The fundamental analysis workflow is an AWS Step Functions state machine (`FundamentalAnalysisStateMachine`) that runs on demand only. It selects corporate bond issuers that have the oldest (or no) analysis, runs an AI-powered analysis on each, and sends a summary email on completion.

Trigger manually via the AWS console or CLI with the following JSON input:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `issuers` | string[] | — | Optional list of issuer names to analyse. When provided, skips automatic selection entirely. |
| `count` | number | `2` | Number of issuers to select automatically (oldest-analysed first). Ignored when `issuers` is provided. |

**Example** – analyse 5 of the least-recently analysed corporate issuers:
```json
{
  "count": 5
}
```

**Example** – analyse specific issuers:
```json
{
  "issuers": ["Kruk S.A.", "Best S.A."]
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

### Roadmap

- **Lenient interest schedule parsing (obligacje.pl).** New bonds are skipped when obligacje.pl lists a different number of interest period first days, rights days and payoff days (e.g. extra trailing rights day, duplicate first day). Pair periods by payoff day and match the nearest first/rights day instead of requiring equal-length lists. Currently affects ACH0427, ALR0628, KR20229, PEOH130 and PS0130 (PS0130's rights days are unusable at the source).
- **Shorter error report email header.** The header section of the Bonds Updater error report email takes too much space; make it more compact. (Done for the update report: title and stage dropped, stage in the subject outside prod.)
- **Update AI model.** Issuer classification and fundamental analysis run on Claude Sonnet 4.6 (and Haiku 4.5 as an option), set in `packages/core/src/ai/models.ts`. Move to a current model.
- **Alternative investment for each ROI.** For each of a bond's ROI figures, show an alternative investment to compare it with.
