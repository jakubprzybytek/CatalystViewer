# Display Issuer Analysis in UI — Design

**Date:** 2026-05-18  
**Status:** Approved

## Overview

Fundamental analysis results (scorecard + markdown report) produced by the `FundamentalAnalysisStateMachine` are currently stored in DynamoDB but not surfaced in the frontend. This spec adds the scorecard to the expandable `IssuerCard` section and makes the full markdown report accessible via a modal.

## Architecture

### Data flow

```
DynamoDB (#LATEST_ANALYSIS records)
  └─ getIssuerProfiles Lambda  ──→  GET /api/issuers/profiles  ──→  IssuersList / IssuerCard
  └─ getIssuerAnalysis Lambda  ──→  GET /api/issuers/{name}/analysis  ──→  AnalysisReportModal
```

On page load, one request loads all profiles with scorecard summaries.  
The full report markdown is fetched lazily only when the user opens the modal.

---

## Section 1 — Data Layer (`packages/core`)

### New type: `DbIssuerAnalysisSummary`

Added to `packages/core/src/storage/issuerProfiles/index.ts`:

```ts
export type DbIssuerAnalysisSummary = {
    issuerName: string;
    performedAt: string;
    performedAtTs: number;
    scorecard?: FundamentalScorecard;
};
```

Omits `reportMarkdown`, `agentLog`, `agentFinancials`, `modelId` — these are large fields not needed in the list view.

### New method: `IssuerProfilesTable.getAllLatestAnalysisSummaries()`

```ts
async getAllLatestAnalysisSummaries(): Promise<DbIssuerAnalysisSummary[]>
```

Scans `#LATEST_ANALYSIS` records with `ProjectionExpression` covering only `issuerName`, `performedAt`, `performedAtTs`, `scorecard`. Returns `DbIssuerAnalysisSummary[]`.

The existing `getAllLatestAnalyses()` (used by `SelectIssuers`) is unchanged.

---

## Section 2 — API Layer (`packages/functions`, `infra`)

### Extend `getIssuerProfiles` Lambda

**File:** `packages/functions/src/issuers/getIssuerProfiles.ts`

Run `getProfiles()` and `getAllLatestAnalysisSummaries()` in parallel. Join by `issuerName`. Return merged result:

```ts
Success({
    issuerProfiles: profiles.map(p => ({
        ...p,
        ...analysisByIssuer.get(p.issuerName),   // scorecard?, performedAt?
    })),
});
```

`reportMarkdown` and `agentLog` are never loaded by this endpoint.

### New Lambda: `getIssuerAnalysis`

**File:** `packages/functions/src/issuers/getIssuerAnalysis.ts`

- Route: `GET /api/issuers/{name}/analysis`
- Auth: `jwtAuth` (same as profiles endpoint)
- Reads path param `name` (URL-decoded) from the API Gateway event
- Calls `issuerProfilesTable.getLatestAnalysis(name)`
- Returns `Success({ reportMarkdown })` or HTTP 404 if no analysis record exists

### `infra/api.ts` changes

- New `sst.aws.Function("GetIssuerAnalysis", { handler: "...", link: [issuerProfilesTable] })`
- New route: `api.route("GET /api/issuers/{name}/analysis", getIssuerAnalysisFunction.arn, jwtAuth)`

---

## Section 3 — Frontend (`packages/web`)

### `packages/web/src/sdk/Issuers.ts`

- Extend `IssuerProfile` type:
  ```ts
  scorecard?: FundamentalScorecard;
  performedAt?: string;
  ```
- Add `getIssuerAnalysis(issuerName: string): Promise<string>`:
  - Calls `GET /api/issuers/:name/analysis` via Amplify
  - Returns `reportMarkdown` string
  - Throws on non-2xx

### `IssuersList.tsx`

- Extend `IssuerReport` type with `scorecard?: FundamentalScorecard` and `performedAt?: string`
- Pass these fields from `issuerProfile` into the `IssuerReport` object (already available via `issuerProfileByName` map)
- Pass through to `IssuerCard`

### `IssuerCard.tsx`

In the collapsible section, after the existing Summary / URL / classifiedAt rows, add:

```
── if scorecard present ──────────────────────
  <IssuerScorecard scorecard={...} />
  <small>Analysed: {performedAt}  <a onClick={openModal}>Full report →</a></small>
──────────────────────────────────────────────
```

`IssuerScorecard` component already exists at `src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx` — no changes needed to it.  
The `IssuerCard` gains a `modalOpen: boolean` local state and passes `issuerReport.name` to the modal.

### New component: `AnalysisReportModal.tsx`

**File:** `packages/web/src/components/BondReportsBrowser/issuers/AnalysisReportModal.tsx`

Props:
```ts
type AnalysisReportModalProps = {
    issuerName: string;
    open: boolean;
    onClose: () => void;
};
```

Behaviour:
- On `open` → call `getIssuerAnalysis(issuerName)`, store result in local state
- While loading → show `CircularProgress` inside the dialog
- On error → show an error message with a retry option
- On success → render `reportMarkdown` using `react-markdown` in a scrollable MUI `Dialog`

The modal title is the issuer name. Dialog is `maxWidth="md"` and `fullWidth`.

### New dependency

Add `react-markdown` to `packages/web/package.json`. Use the default render pipeline (no `dangerouslySetInnerHTML`).

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Issuer has no analysis | `scorecard` and `performedAt` absent from `IssuerProfile`; nothing shown in card |
| `getIssuerAnalysis` returns 404 | Modal shows "No report available" |
| `getIssuerAnalysis` network error | Modal shows error message |
| `getAllLatestAnalysisSummaries` scan fails | `getIssuerProfiles` Lambda re-throws; existing error handling applies |

---

## Files Changed

| File | Change |
|---|---|
| `packages/core/src/storage/issuerProfiles/index.ts` | Add `DbIssuerAnalysisSummary` type |
| `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts` | Add `getAllLatestAnalysisSummaries()` |
| `packages/functions/src/issuers/getIssuerProfiles.ts` | Extend to join analysis summaries |
| `packages/functions/src/issuers/getIssuerAnalysis.ts` | New Lambda handler |
| `infra/api.ts` | New function + route |
| `packages/web/src/sdk/Issuers.ts` | Extend `IssuerProfile`; add `getIssuerAnalysis()` |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuersList.tsx` | Extend `IssuerReport`; pass scorecard fields |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx` | Show scorecard + modal trigger in collapsible |
| `packages/web/src/components/BondReportsBrowser/issuers/AnalysisReportModal.tsx` | New component |
| `packages/web/package.json` | Add `react-markdown` dependency |
