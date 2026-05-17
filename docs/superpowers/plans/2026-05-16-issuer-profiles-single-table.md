# IssuerProfiles Single-Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the `IssuerProfiles` + `IssuerFinancials` two-table design into a single `IssuerProfiles` table with a `recordType` sort key. Add analysis-record write support to the `analyze-issuer` script. Remove all `IssuerFinancials` infrastructure.

**Spec:** `docs/superpowers/specs/2026-05-16-issuer-profiles-single-table-design.md`

**Tech Stack:** TypeScript, AWS DynamoDB + SST v3, AWS Lambda, Next.js

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `infra/storage.ts` | Modify | Add `recordType` SK to `IssuerProfiles`; remove `issuerFinancialsTable` |
| `infra/api.ts` | Modify | Remove `GetIssuerFinancials` Lambda + route; remove `issuerFinancialsTable` import |
| `packages/core/src/storage/issuerProfiles/index.ts` | Modify | Rename `DbIssuerProfile` → `DbIssuerProfileRecord`; add `recordType`; add `DbIssuerAnalysisRecord` |
| `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts` | Modify | Add SK; add `storeProfile()`, `getProfiles()`, `storeAnalysis()`, `getLatestAnalysis()`, `getAnalysisHistory()`; update `getAll()` to filter `#PROFILE` rows |
| `packages/core/src/storage/issuerFinancials/index.ts` | **Delete** | Superseded |
| `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts` | **Delete** | Superseded |
| `packages/functions/src/issuers/getIssuerProfiles.ts` | Modify | Call `getProfiles()` instead of `getAll()` |
| `packages/functions/src/issuers/classifyIssuers.ts` | Modify | Call `storeProfile()` instead of `store()`; add `recordType: '#PROFILE'` to item |
| `packages/functions/src/issuers/collectUnclassifiedIssuers.ts` | Modify | Call `getProfiles()` instead of `getAll()` |
| `packages/functions/src/issuers/getIssuerFinancials.ts` | **Delete** | Endpoint removed |
| `packages/web/src/sdk/Issuers.ts` | Modify | Remove `getIssuerFinancials()`, `FinancialYear`, `IssuerFinancialsQueryResult` |
| `packages/web/src/components/BondReportsBrowser/index.tsx` | Modify | Remove `issuerFinancials` state, `getIssuerFinancials()` fetch, `financialsByIssuer` memo |
| `scripts/analyze-issuer/analyze-issuer.ts` | Modify | Add DynamoDB write: `#ANALYSIS#<iso>` row + overwrite `#LATEST_ANALYSIS` |
| `scripts/store-issuer-financials/` | **Delete** | Superseded by `analyze-issuer` |

---

## Task 1 — Storage types: update `DbIssuerProfile` and add `DbIssuerAnalysisRecord`

**File:** `packages/core/src/storage/issuerProfiles/index.ts`

- [ ] **Step 1: Update `DbIssuerProfileRecord` and add `DbIssuerAnalysisRecord`**

Replace the entire file contents:

```ts
export * from './IssuerProfilesTable';

import type { FundamentalScorecard } from '../../bonds/fundamentals/scorecard';

export type DbIssuerProfileRecord = {
    issuerName: string;        // PK
    recordType: '#PROFILE';    // SK (literal)
    industry: string;
    businessSummary: string;
    websiteUrl?: string;
    classifiedAt: string;      // ISO 8601 (debugging)
    classifiedAtTs: number;    // Unix ms (business logic)
    modelId: string;
};

export type DbIssuerAnalysisRecord = {
    issuerName: string;        // PK
    recordType: string;        // SK: "#ANALYSIS#<iso>" | "#LATEST_ANALYSIS"
    performedAt: string;       // ISO 8601 (debugging)
    performedAtTs: number;     // Unix ms (business logic)
    modelId: string;
    scorecard?: FundamentalScorecard;
    agentFinancials?: unknown;
    agentLog?: unknown[];
};
```

---

## Task 2 — Storage class: update `IssuerProfilesTable`

**File:** `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts`

- [ ] **Step 1: Rewrite the table class**

Replace the entire file contents:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DbIssuerProfileRecord, DbIssuerAnalysisRecord } from '.';
import { scanAll, queryAll } from '../utils';

export class IssuerProfilesTable {
    readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
    readonly tableName: string;

    constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
        this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true }
        });
        this.tableName = tableName;
    }

    async getProfiles(): Promise<DbIssuerProfileRecord[]> {
        console.log('IssuerProfilesTable: Fetching all issuer profiles');

        const startTimestamp = new Date().getTime();

        const scanCommand = new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'recordType = :rt',
            ExpressionAttributeValues: { ':rt': '#PROFILE' },
        });

        const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
        const endTimestamp = new Date().getTime();
        console.log(`IssuerProfilesTable: Returning ${result.Count ?? 0} profiles in ${endTimestamp - startTimestamp} ms.`);

        return result.Items ? result.Items as DbIssuerProfileRecord[] : [];
    }

    // Kept for backwards-compat — delegates to getProfiles()
    async getAll(): Promise<DbIssuerProfileRecord[]> {
        return this.getProfiles();
    }

    async storeProfile(profile: DbIssuerProfileRecord): Promise<void> {
        console.log(`IssuerProfilesTable: Storing profile for '${profile.issuerName}'`);

        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: profile,
        }));
    }

    // Kept for backwards-compat — delegates to storeProfile()
    async store(profile: DbIssuerProfileRecord): Promise<void> {
        return this.storeProfile(profile);
    }

    async storeAnalysis(analysis: DbIssuerAnalysisRecord): Promise<void> {
        console.log(`IssuerProfilesTable: Storing analysis for '${analysis.issuerName}' at ${analysis.performedAt}`);

        // Write the timestamped row
        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: analysis,
        }));

        // Overwrite the #LATEST_ANALYSIS mirror
        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: { ...analysis, recordType: '#LATEST_ANALYSIS' },
        }));
    }

    async getLatestAnalysis(issuerName: string): Promise<DbIssuerAnalysisRecord | undefined> {
        const result = await this.dynamoDBDocumentClient.send(new GetCommand({
            TableName: this.tableName,
            Key: { issuerName, recordType: '#LATEST_ANALYSIS' },
        }));

        return result.Item as DbIssuerAnalysisRecord | undefined;
    }

    async getAnalysisHistory(issuerName: string): Promise<DbIssuerAnalysisRecord[]> {
        const queryCommand = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'issuerName = :name AND begins_with(recordType, :prefix)',
            ExpressionAttributeValues: {
                ':name': issuerName,
                ':prefix': '#ANALYSIS#',
            },
            ScanIndexForward: false,
        });

        const result = await queryAll(this.dynamoDBDocumentClient, queryCommand);
        return result.Items ? result.Items as DbIssuerAnalysisRecord[] : [];
    }
}
```

---

## Task 3 — Infra: update `IssuerProfiles` table schema and remove `IssuerFinancials`

**File:** `infra/storage.ts`

- [ ] **Step 1: Add `recordType` SK to `issuerProfilesTable`; delete `issuerFinancialsTable`**

Replace the `issuerProfilesTable` definition with:

```ts
export const issuerProfilesTable = new sst.aws.Dynamo("IssuerProfiles", {
  fields: {
    issuerName: "string",
    recordType: "string",
  },
  primaryIndex: {
    hashKey: "issuerName",
    rangeKey: "recordType",
  },
});
```

Remove the entire `issuerFinancialsTable` block.

---

## Task 4 — Infra: remove `GetIssuerFinancials` Lambda and route

**File:** `infra/api.ts`

- [ ] **Step 1: Remove `issuerFinancialsTable` from the import**

Update the import line — remove `issuerFinancialsTable`:

```ts
import { profilesTable, bondDetailsTable, bondStatisticsTable, issuerProfilesTable } from "./storage";
```

- [ ] **Step 2: Remove the `GetIssuerFinancials` Lambda function declaration**

Delete the block:

```ts
const getIssuerFinancialsFunction = new sst.aws.Function("GetIssuerFinancials", {
  handler: "packages/functions/src/issuers/getIssuerFinancials.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerFinancialsTable],
});
```

- [ ] **Step 3: Remove the `GET /api/issuers/financials` route**

Delete the line:

```ts
api.route("GET /api/issuers/financials", getIssuerFinancialsFunction.arn, jwtAuth);
```

---

## Task 5 — Lambda handlers: update callers

**Files:** `packages/functions/src/issuers/getIssuerProfiles.ts`, `collectUnclassifiedIssuers.ts`, `classifyIssuers.ts`

- [ ] **Step 1: `getIssuerProfiles.ts` — call `getProfiles()` instead of `getAll()`**

Update the handler body:

```ts
const issuerProfiles = await issuerProfilesTable.getProfiles();
```

*(Note: `getAll()` is aliased to `getProfiles()` so this is a clean-up, not a bug fix. Either works.)*

- [ ] **Step 2: `collectUnclassifiedIssuers.ts` — call `getProfiles()` instead of `getAll()`**

Update:

```ts
issuerProfilesTable.getProfiles(),
```

- [ ] **Step 3: `classifyIssuers.ts` — call `storeProfile()` and add `recordType`**

Update the `store` call to:

```ts
await issuerProfilesTable.storeProfile({
    issuerName,
    recordType: '#PROFILE',
    industry: classification.industry,
    businessSummary: classification.businessSummary,
    websiteUrl: classification.websiteUrl,
    classifiedAt: now.toISOString(),
    classifiedAtTs: now.getTime(),
    modelId: MODEL_ID,
});
```

---

## Task 6 — Delete `issuerFinancials` storage folder and Lambda handler

- [ ] **Step 1: Delete `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts`**
- [ ] **Step 2: Delete `packages/core/src/storage/issuerFinancials/index.ts`**
- [ ] **Step 3: Delete `packages/functions/src/issuers/getIssuerFinancials.ts`**

---

## Task 7 — Frontend SDK: remove `getIssuerFinancials`

**File:** `packages/web/src/sdk/Issuers.ts`

- [ ] **Step 1: Remove the financials section**

Delete the following from `Issuers.ts`:
- `FinancialYear` type
- `IssuerFinancialsQueryResult` type
- `getIssuerFinancials()` function

---

## Task 8 — Frontend component: remove financials fetch and state

**File:** `packages/web/src/components/BondReportsBrowser/index.tsx`

- [ ] **Step 1: Remove the `getIssuerFinancials` import**

Update the import from `@/sdk/Issuers` to remove `getIssuerFinancials` and `FinancialYear`.

- [ ] **Step 2: Remove `issuerFinancials` state**

Delete:
```ts
const [issuerFinancials, setIssuerFinancials] = useState<FinancialYear[]>([]);
```

- [ ] **Step 3: Remove `getIssuerFinancials()` from the `Promise.all` fetch**

Update the `Promise.all` to only fetch bonds and profiles:
```ts
const [bondsResponse, issuerProfilesResponse] = await Promise.all([
  getBondReports(bondType),
  getIssuerProfiles(),
]);
```

Remove the `setIssuerFinancials(...)` assignments in the try/catch.

- [ ] **Step 4: Remove the `financialsByIssuer` memo**

Delete the `useMemo` block that reduces `issuerFinancials` into a `Map<string, FinancialYear[]>`.

- [ ] **Step 5: Remove any `issuerFinancials` or `financialsByIssuer` prop-passing to child components**

Search for any remaining usages of `financialsByIssuer` or `issuerFinancials` in JSX and remove them.

---

## Task 9 — Script: add DynamoDB write to `analyze-issuer`

**File:** `scripts/analyze-issuer/analyze-issuer.ts`

- [ ] **Step 1: Add imports**

Add at the top (after existing imports):

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
```

The `TABLE_NAME` must be configured via env (or `.env.local`). Add a constant:

```ts
const ISSUER_PROFILES_TABLE_NAME = process.env.ISSUER_PROFILES_TABLE_NAME ?? '';
```

Add to `.env.local.example` (and the script's own `.env.local`):
```
ISSUER_PROFILES_TABLE_NAME=replace-with-actual-table-name
```

- [ ] **Step 2: Add DynamoDB write after scorecard computation**

After `const scorecard = computeScorecard(financialYears);`, add:

```ts
if (ISSUER_PROFILES_TABLE_NAME) {
    const dynamoDBClient = new DynamoDBClient({});
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, ISSUER_PROFILES_TABLE_NAME);

    const now = new Date();
    await issuerProfilesTable.storeAnalysis({
        issuerName,
        recordType: `#ANALYSIS#${now.toISOString()}`,
        performedAt: now.toISOString(),
        performedAtTs: now.getTime(),
        modelId: MODEL_ID,
        scorecard,
        agentFinancials: result,
        agentLog: agentEvents,
    });

    console.log(`\nAnalysis stored to DynamoDB (${ISSUER_PROFILES_TABLE_NAME})`);
} else {
    console.log('\n[DRY RUN] ISSUER_PROFILES_TABLE_NAME not set — skipping DynamoDB write.');
}
```

- [ ] **Step 3: Capture agent events**

The `agentLoop.run()` call already accepts an `onEvent` callback. To capture events for storage, collect them alongside the console output. Change:

```ts
const rawAnswer = await agentLoop.run(taskPrompt, onEvent);
```

to:

```ts
const agentEvents: unknown[] = [];
const rawAnswer = await agentLoop.run(taskPrompt, (event) => {
    agentEvents.push(event);
    onEvent(event);
});
```

---

## Task 10 — Delete `scripts/store-issuer-financials`

- [ ] **Step 1: Delete the entire `scripts/store-issuer-financials/` folder**

---

## Task 11 — Type-check and verify

- [ ] **Step 1: Run TypeScript compiler across all packages**

```sh
pnpm tsc --noEmit -p packages/core/tsconfig.json
pnpm tsc --noEmit -p packages/functions/tsconfig.json
pnpm tsc --noEmit -p packages/web/tsconfig.json
pnpm tsc --noEmit -p scripts/analyze-issuer/tsconfig.json
```

Fix any type errors before considering the plan complete.

- [ ] **Step 2: Confirm no remaining references to deleted symbols**

```sh
grep -r "IssuerFinancials\|issuerFinancials\|getIssuerFinancials\|DbIssuerFinancials\|FinancialYear\|financialsByIssuer" \
  packages/ infra/ scripts/ --include="*.ts" --include="*.tsx" -l
```

Expected: no output (zero files).
