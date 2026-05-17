# Design: IssuerProfiles Single-Table Design

**Date:** 2026-05-16
**Status:** Draft

---

## Overview

The current data model uses two separate DynamoDB tables:
- `IssuerProfiles` — one row per issuer (industry classification, business summary)
- `IssuerFinancials` — one row per issuer per year (annual financial metrics)

This design replaces both tables with a single `IssuerProfiles` table that uses a sort key (`recordType`) to hold different kinds of issuer data — a profile record, timestamped analysis records, and a "latest analysis" mirror record.

The `IssuerFinancials` table and all its infrastructure (Lambda, API route, SDK function, script) are removed.

---

## Table Schema

**Table name:** `IssuerProfiles`
**Primary key:** `issuerName` (PK, string) + `recordType` (SK, string)

| `issuerName` (PK) | `recordType` (SK) | Row type |
|---|---|---|
| `"Pepco Group NV"` | `#PROFILE` | Industry/summary data for the issuer |
| `"Pepco Group NV"` | `#ANALYSIS#2026-05-16T14:32:00.000Z` | Timestamped analysis run |
| `"Pepco Group NV"` | `#LATEST_ANALYSIS` | Mirror of the most recent analysis row |

**Sort key conventions:**
- All structured sort keys use a `#` prefix for consistency.
- Lexicographic order: `#ANALYSIS#*` < `#LATEST_ANALYSIS` < `#PROFILE` (A < L < P), keeping special rows grouped and predictable.
- `#ANALYSIS#<iso-timestamp>` rows sort chronologically — newest sorts last, making it easy to get recent analyses with `ScanIndexForward: false`.
- `#LATEST_ANALYSIS` is always overwritten in the same write as a new `#ANALYSIS#*` row. It is the canonical "current" view with no query overhead.

---

## Row Type Definitions

### `DbIssuerProfileRecord` — `#PROFILE`

```ts
export type DbIssuerProfileRecord = {
    issuerName: string;       // PK
    recordType: '#PROFILE';   // SK (literal)
    industry: string;
    businessSummary: string;
    websiteUrl?: string;
    classifiedAt: string;     // ISO 8601 (debugging)
    classifiedAtTs: number;   // Unix ms (business logic)
    modelId: string;
};
```

This is a direct migration of the current `DbIssuerProfile` — only the `recordType` field is added.

### `DbIssuerAnalysisRecord` — `#ANALYSIS#<iso>` and `#LATEST_ANALYSIS`

```ts
export type DbIssuerAnalysisRecord = {
    issuerName: string;        // PK
    recordType: string;        // SK: "#ANALYSIS#<iso>" | "#LATEST_ANALYSIS"
    performedAt: string;       // ISO 8601 timestamp (same value embedded in ANALYSIS# SK)
    performedAtTs: number;     // Unix ms — used for sorting / recency checks
    modelId: string;
    // well-defined output
    scorecard?: FundamentalScorecard;   // traffic-light result from computeScorecard()
    // flexible agent output — structure may change across analysis versions
    agentFinancials?: unknown;          // AgentFinancials blob from analyze-issuer script
    agentLog?: unknown[];               // full AgentEvent[] log for debugging/validation
};
```

The `scorecard` field is the stable, typed contract consumed by the frontend. All other fields under an analysis row are treated as opaque blobs — useful for audit and debugging but not for business logic.

---

## Write Flows

### Storing a profile (classifyIssuers Lambda)

Same as today, but `recordType: '#PROFILE'` is added to the item. No other changes to `classifyIssuers.ts`.

```ts
await issuerProfilesTable.storeProfile({
    issuerName,
    recordType: '#PROFILE',
    industry: ...,
    ...
});
```

### Storing an analysis (analyze-issuer script)

After the agent run completes and the scorecard is computed:

1. Build a `DbIssuerAnalysisRecord` with `recordType = #ANALYSIS#<iso>`
2. Write it to DynamoDB (new timestamped row)
3. Write the same record again with `recordType = #LATEST_ANALYSIS` (overwrites previous latest)

Both writes happen in sequence (no transaction needed — a partial write leaves a stale `#LATEST_ANALYSIS` at worst, which is acceptable).

---

## Read Flows

| Query | DynamoDB operation |
|---|---|
| Get profile for one issuer | `GetItem(issuerName, #PROFILE)` |
| Get latest analysis for one issuer | `GetItem(issuerName, #LATEST_ANALYSIS)` |
| Get all analyses for one issuer | `Query(PK=issuerName, SK begins_with "#ANALYSIS#")` |
| Get all profiles (current scan) | `Scan` + filter `recordType = #PROFILE` (or a FilterExpression) |

The existing `getIssuerProfiles` Lambda uses a full `Scan`. After migration it must filter to only return `#PROFILE` rows, to avoid returning analysis rows to the frontend.

---

## Frontend / API Changes

The `/api/issuers/financials` endpoint and `GetIssuerFinancials` Lambda are removed. The frontend `BondReportsBrowser` currently fetches financials separately and joins them client-side with profiles. After this change, the financials (via scorecard) are available on-demand from the analysis row — not bulk-fetched on page load.

For now, the frontend scorecard display is untouched (a follow-on story will wire up the new analysis endpoint). The only frontend change in this story is removing the dead `getIssuerFinancials()` call and the `issuerFinancials` state that depends on it.

---

## Deleted Components

| Component | Reason |
|---|---|
| `IssuerFinancials` DynamoDB table (`infra/storage.ts`) | Replaced by analysis rows in `IssuerProfiles` |
| `packages/core/src/storage/issuerFinancials/` | Storage class + type deleted |
| `GetIssuerFinancials` Lambda (`infra/api.ts`) | Route removed |
| `packages/functions/src/issuers/getIssuerFinancials.ts` | Handler deleted |
| `packages/web/src/sdk/Issuers.ts` — `getIssuerFinancials()`, `FinancialYear` | Dead code once endpoint is gone |
| `scripts/store-issuer-financials/` | Superseded by `analyze-issuer` script which will write to the table directly |
| `sst-env.d.ts` — `IssuerFinancials` + `GetIssuerFinancials` entries | Auto-regenerated after deploy |

---

## File Map

| File | Change |
|---|---|
| `infra/storage.ts` | Replace `issuerProfilesTable` (no SK) + `issuerFinancialsTable` with single `issuerProfilesTable` (add `recordType` SK); remove `issuerFinancialsTable` |
| `infra/api.ts` | Remove `issuerFinancialsTable` import, `GetIssuerFinancials` Function, and `GET /api/issuers/financials` route |
| `packages/core/src/storage/issuerProfiles/index.ts` | Rename `DbIssuerProfile` → `DbIssuerProfileRecord` (add `recordType`); add `DbIssuerAnalysisRecord` type |
| `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts` | Add `recordType` SK to table; add `getProfile()`, `storeAnalysis()`, `getLatestAnalysis()`, `getAnalysisHistory()` methods; update `getAll()` to filter `#PROFILE` rows only; update `store()` → `storeProfile()` |
| `packages/core/src/storage/issuerFinancials/index.ts` | **Delete** |
| `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts` | **Delete** |
| `packages/functions/src/issuers/getIssuerProfiles.ts` | Update `getAll()` → `getProfiles()` if renamed; otherwise unchanged |
| `packages/functions/src/issuers/classifyIssuers.ts` | Add `recordType: '#PROFILE'` to stored item; update `store()` → `storeProfile()` |
| `packages/functions/src/issuers/getIssuerFinancials.ts` | **Delete** |
| `packages/web/src/sdk/Issuers.ts` | Remove `getIssuerFinancials()`, `FinancialYear`, `IssuerFinancialsQueryResult` |
| `packages/web/src/components/BondReportsBrowser/index.tsx` | Remove `issuerFinancials` state, `getIssuerFinancials()` fetch call, and related `useMemo` |
| `scripts/store-issuer-financials/` | **Delete entire folder** |
| `scripts/analyze-issuer/analyze-issuer.ts` | Add DynamoDB write at end: write `#ANALYSIS#<iso>` row + overwrite `#LATEST_ANALYSIS` row |
| `sst-env.d.ts` | Remove `IssuerFinancials` and `GetIssuerFinancials` entries (auto-regenerated on next deploy) |

---

## Out of Scope

- Wiring the new analysis endpoint to the frontend scorecard display (follow-on story)
- `GET /api/issuers/analyses` endpoint for fetching analysis data (follow-on story)
- Backfilling existing `IssuerFinancials` rows into analysis rows (the old data will be left in place until the old table is dropped from infra; the `store-issuer-financials` script can be re-run against the new table if needed)
