# Map-Based Issuer Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-Lambda batch `ClassifyIssuers` step in `BondsUpdaterStateMachine` with a Step Functions `Map` state that classifies each issuer in an isolated Lambda invocation, so that a timeout or error on one issuer does not discard progress for all other issuers.

**Architecture:** A new single-issuer Lambda `classifyIssuer.ts` (singular) replaces the batch `classifyIssuers.ts` (plural). Cap-slicing logic is moved into `CollectUnclassifiedIssuers` so that the `Map` state iterates only the already-capped list. Each Map iteration calls the new Lambda independently; failures are caught inside the iterator and produce a structured failure result. The Map output (`classificationResults`) is consumed by `SendReport`.

**Tech Stack:** AWS Step Functions (Map state), AWS Lambda (Node.js/TypeScript), SST v3 (`sst.aws.Function`), Pulumi-style infra (`infra/updater.ts`), `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-dynamodb`, `@aws-lambda-powertools/logger`.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `packages/functions/src/issuers/index.ts` | Add `ClassifyIssuerInput`, `ClassifyIssuerResult`, `ClassifiedIssuerResult`, `FailedIssuerResult`; update `SendReportInput` |
| Create | `packages/functions/src/issuers/classifyIssuer.ts` | New single-issuer Lambda handler |
| Modify | `packages/functions/src/issuers/collectUnclassifiedIssuers.ts` | Move cap-slicing logic here |
| Modify | `packages/functions/src/emails/sendReport.ts` | Read `classificationResults` instead of `classifiedIssuers`/`failedIssuers` |
| Modify | `infra/updater.ts` | Add `classifyIssuerFunction`, update IAM policy, refactor state machine |
| Delete | `packages/functions/src/issuers/classifyIssuers.ts` | Replaced by single-issuer Lambda |

---

### Task 1: Update types

**Files:**
- Modify: `packages/functions/src/issuers/index.ts`

- [ ] **Step 1.1: Replace `ClassifyIssuersResult` and update `SendReportInput`**

Open `packages/functions/src/issuers/index.ts`. The file currently defines:
```ts
export type ClassifyIssuersResult = CollectIssuersResult & {
    classifiedIssuers: ClassifiedIssuer[];
    failedIssuers: FailedIssuer[];
};

export type SendReportInput = CollectIssuersResult & Partial<Pick<ClassifyIssuersResult, 'classifiedIssuers' | 'failedIssuers'>>;
```

Replace those two types with the new single-issuer result union and an updated `SendReportInput`:

```ts
export type ClassifyIssuerInput = {
    issuerName: string;
};

export type ClassifiedIssuerResult = ClassifiedIssuer & { success: true };
export type FailedIssuerResult = { issuerName: string; errorReason: string; success: false };
export type ClassifyIssuerResult = ClassifiedIssuerResult | FailedIssuerResult;

export type SendReportInput = CollectIssuersResult & {
    classificationResults?: ClassifyIssuerResult[];
};
```

Keep all other existing types (`ClassifiedIssuer`, `FailedIssuer`, `ClassificationConfig`, `CollectIssuersResult`, `UpdateBondsResult`, `SelectIssuersInput`, `SelectIssuersResult`, `AnalyzeIssuerInput`, `AnalyzeIssuerResult`) untouched.

- [ ] **Step 1.2: Check for TypeScript errors**

```bash
cd /workspaces/CatalystViewer && pnpm --filter @functions/src tsc --noEmit 2>&1 | head -40
```

Expected: errors only in `classifyIssuers.ts` (plural, which uses the old types — that file will be deleted in Task 5) and possibly `sendReport.ts` (fixed in Task 3). No other files should break.

- [ ] **Step 1.3: Commit**

```bash
git add packages/functions/src/issuers/index.ts
git commit -m "refactor: update types for single-issuer classification"
```

---

### Task 2: Create single-issuer Lambda

**Files:**
- Create: `packages/functions/src/issuers/classifyIssuer.ts`

- [ ] **Step 2.1: Create the handler**

Create `packages/functions/src/issuers/classifyIssuer.ts` with the following content:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { ClassifyIssuerInput, ClassifyIssuerResult } from '.';

const logger = new Logger({ serviceName: 'ClassifyIssuer' });

const dynamoDbClient = new DynamoDBClient({});

const bedrockClient = new BedrockRuntimeClient({
    maxAttempts: 1,
});

const tavilyClient = new TavilyClient(process.env.TAVILY_API_KEY ?? '');

export async function handler(input: ClassifyIssuerInput, context: Context): Promise<ClassifyIssuerResult> {
    logger.addContext(context);

    const { issuerName } = input;

    logger.info('Classifying issuer', { issuerName });

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const classification = await classifyIssuer(bedrockClient, tavilyClient, issuerName);

    const now = new Date();
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

    const result: ClassifyIssuerResult = {
        success: true,
        issuerName,
        industry: classification.industry,
        businessSummary: classification.businessSummary,
        websiteUrl: classification.websiteUrl,
        modelId: MODEL_ID,
    };

    logger.info('Issuer classified', { issuerName, industry: classification.industry });

    return result;
}
```

Note: This handler intentionally lets exceptions propagate — Step Functions `Catch` in the Map iterator handles the failure case and produces the `{ success: false, ... }` result shape via the `HandleClassificationFailure` Pass state.

- [ ] **Step 2.2: Check for TypeScript errors**

```bash
cd /workspaces/CatalystViewer && pnpm --filter @functions/src tsc --noEmit 2>&1 | head -40
```

Expected: no errors in the new file. Only existing errors in `classifyIssuers.ts` (plural) and `sendReport.ts` (fixed in Task 3).

- [ ] **Step 2.3: Commit**

```bash
git add packages/functions/src/issuers/classifyIssuer.ts
git commit -m "feat: add single-issuer classify Lambda"
```

---

### Task 3: Move cap-slicing into `collectUnclassifiedIssuers.ts`

**Files:**
- Modify: `packages/functions/src/issuers/collectUnclassifiedIssuers.ts`

**Context:** Currently `classifyIssuers.ts` (plural) applies the `classificationsCap` to slice `unclassifiedIssuers` before looping. With the Map approach, Step Functions iterates the full `unclassifiedIssuers` array, so the cap must be applied before the Map runs — i.e., inside `CollectUnclassifiedIssuers`.

The constant `DEFAULT_MAX_ISSUERS_PER_RUN = 10` currently lives in `classifyIssuers.ts`. It moves here.

- [ ] **Step 3.1: Add cap-slicing to `collectUnclassifiedIssuers.ts`**

The current file ends the non-force path with:
```ts
const classifiedIssuers = new Set(existingProfiles.map(p => p.issuerName));
const unclassifiedIssuers = allIssuers.filter(issuer => !classifiedIssuers.has(issuer));

logger.info('Unclassified issuers collected', { totalIssuers: allIssuers.length, alreadyClassified: classifiedIssuers.size, toClassify: unclassifiedIssuers.length });

return {
    ...input,
    unclassifiedIssuers,
};
```

Replace that block with:
```ts
const DEFAULT_MAX_ISSUERS_PER_RUN = 10;

function resolveClassificationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

// ... (inside the handler, replace the end of the non-force branch) ...

const classifiedIssuers = new Set(existingProfiles.map(p => p.issuerName));
const allUnclassifiedIssuers = allIssuers.filter(issuer => !classifiedIssuers.has(issuer));
const cap = resolveClassificationsCap(input.classificationsCap);
const unclassifiedIssuers = allUnclassifiedIssuers.slice(0, cap);

logger.info('Unclassified issuers collected', {
    totalIssuers: allIssuers.length,
    alreadyClassified: classifiedIssuers.size,
    toClassify: allUnclassifiedIssuers.length,
    cap,
    cappedTo: unclassifiedIssuers.length,
});

return {
    ...input,
    unclassifiedIssuers,
};
```

The complete updated handler in full:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { UpdateBondsResult } from '../bonds';
import { ClassificationConfig, CollectIssuersResult } from '.';

const logger = new Logger({ serviceName: 'CollectUnclassifiedIssuers' });

const DEFAULT_MAX_ISSUERS_PER_RUN = 10;

const dynamoDbClient = new DynamoDBClient({});

function resolveClassificationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

export async function handler(input: UpdateBondsResult & ClassificationConfig, context: Context): Promise<CollectIssuersResult> {
    logger.addContext(context);

    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, Resource.BondDetails.name);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const [activeBonds, existingProfiles] = await Promise.all([
        bondDetailsTable.getAllActive(),
        issuerProfilesTable.getProfiles(),
    ]);

    const allIssuers = [...new Set(activeBonds.map(b => b.issuer))];

    if (input.forceClassification) {
        logger.info('Force classification enabled, returning all issuers', { totalIssuers: allIssuers.length });
        return {
            ...input,
            unclassifiedIssuers: allIssuers,
        };
    }

    const classifiedIssuers = new Set(existingProfiles.map(p => p.issuerName));
    const allUnclassifiedIssuers = allIssuers.filter(issuer => !classifiedIssuers.has(issuer));
    const cap = resolveClassificationsCap(input.classificationsCap);
    const unclassifiedIssuers = allUnclassifiedIssuers.slice(0, cap);

    logger.info('Unclassified issuers collected', {
        totalIssuers: allIssuers.length,
        alreadyClassified: classifiedIssuers.size,
        toClassify: allUnclassifiedIssuers.length,
        cap,
        cappedTo: unclassifiedIssuers.length,
    });

    return {
        ...input,
        unclassifiedIssuers,
    };
}
```

- [ ] **Step 3.2: Check for TypeScript errors**

```bash
cd /workspaces/CatalystViewer && pnpm --filter @functions/src tsc --noEmit 2>&1 | head -40
```

Expected: no new errors in `collectUnclassifiedIssuers.ts`.

- [ ] **Step 3.3: Commit**

```bash
git add packages/functions/src/issuers/collectUnclassifiedIssuers.ts
git commit -m "refactor: move cap-slicing logic into CollectUnclassifiedIssuers"
```

---

### Task 4: Update `sendReport.ts` to use `classificationResults`

**Files:**
- Modify: `packages/functions/src/emails/sendReport.ts`

**Context:** `SendReportInput` now has `classificationResults?: ClassifyIssuerResult[]` instead of separate `classifiedIssuers` and `failedIssuers` fields. The handler must split the unified array.

- [ ] **Step 4.1: Update the handler**

In `packages/functions/src/emails/sendReport.ts`, replace the import:

```ts
import { SendReportInput } from '../issuers';
```

(already present — no change needed for the import line).

Replace these two lines inside the `handler` function:
```ts
    const classifiedIssuers = input.classifiedIssuers ?? [];
    const failedIssuers = input.failedIssuers ?? [];
```

With:
```ts
    const classificationResults = input.classificationResults ?? [];
    const classifiedIssuers = classificationResults.filter((r): r is import('../issuers').ClassifiedIssuerResult => r.success);
    const failedIssuers = classificationResults.filter((r): r is import('../issuers').FailedIssuerResult => !r.success);
```

To avoid inline imports, add the named types to the existing `import` from `'../issuers'` at the top of the file:

```ts
import { SendReportInput, ClassifiedIssuerResult, FailedIssuerResult } from '../issuers';
```

Then inside the handler:

```ts
    const classificationResults = input.classificationResults ?? [];
    const classifiedIssuers = classificationResults.filter((r): r is ClassifiedIssuerResult => r.success);
    const failedIssuers = classificationResults.filter((r): r is FailedIssuerResult => !r.success);
```

The rest of the handler (`classifiedIssuers` and `failedIssuers` usages for logging and template rendering) remains unchanged.

- [ ] **Step 4.2: Check for TypeScript errors**

```bash
cd /workspaces/CatalystViewer && pnpm --filter @functions/src tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `sendReport.ts`. The only remaining TypeScript errors should be in `classifyIssuers.ts` (plural, which uses the now-removed `ClassifyIssuersResult` type) — that file is deleted in Task 5.

- [ ] **Step 4.3: Commit**

```bash
git add packages/functions/src/emails/sendReport.ts
git commit -m "refactor: sendReport reads classificationResults array"
```

---

### Task 5: Update infra — new Lambda + refactored state machine

**Files:**
- Modify: `infra/updater.ts`

This is the largest change. It has three parts:
1. Add the `classifyIssuerFunction` SST function.
2. Update `BondsUpdaterSfnPolicy` to grant permission to invoke it.
3. Replace the `ClassifyIssuers` Task state with a `Map` state that calls `classifyIssuerFunction` per issuer.

- [ ] **Step 5.1: Add the `classifyIssuerFunction` SST function**

In `infra/updater.ts`, after the existing `classifyIssuersFunction` definition (around line 68), add:

```ts
const classifyIssuerFunction = new sst.aws.Function("ClassifyIssuer", {
  handler: "packages/functions/src/issuers/classifyIssuer.handler",
  timeout: "2 minutes",
  link: [issuerProfilesTable],
  environment: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ?? "",
  },
  permissions: [
    {
      actions: ["bedrock:InvokeModel"],
      resources: [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:*:inference-profile/*",
      ],
    },
  ],
});
```

- [ ] **Step 5.2: Update `BondsUpdaterSfnPolicy` to include the new function**

Find the `BondsUpdaterSfnPolicy` block. It currently resolves:
```ts
$resolve([
  bondsUpdaterFunction.arn,
  sendReportFunction.arn,
  collectUnclassifiedIssuersFunction.arn,
  classifyIssuersFunction.arn,
  sendErrorReportFunction.arn,
]).apply(([updaterArn, sendReportArn, collectArn, classifyArn, sendErrorReportArn]) =>
```

Replace it to add `classifyIssuerFunction.arn` and remove `classifyIssuersFunction.arn`:
```ts
$resolve([
  bondsUpdaterFunction.arn,
  sendReportFunction.arn,
  collectUnclassifiedIssuersFunction.arn,
  classifyIssuerFunction.arn,
  sendErrorReportFunction.arn,
]).apply(([updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn]) =>
  JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "lambda:InvokeFunction",
        Resource: [updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn],
      },
    ],
  })
),
```

- [ ] **Step 5.3: Update the `stateMachine` definition to use Map**

The `stateMachine` definition currently resolves 5 ARNs. Replace it to resolve `classifyIssuerFunction.arn` instead of `classifyIssuersFunction.arn`:

```ts
const stateMachine = new aws.sfn.StateMachine("BondsUpdaterStateMachine", {
  name: `BondsUpdaterStateMachine-${$app.stage}`,
  roleArn: sfnRole.arn,
  definition: $resolve([
    bondsUpdaterFunction.arn,
    sendReportFunction.arn,
    collectUnclassifiedIssuersFunction.arn,
    classifyIssuerFunction.arn,
    sendErrorReportFunction.arn,
  ]).apply(([updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn]) =>
```

Inside the JSON definition, replace the `"ClassifyIssuers"` Task state with a Map state. Find this block:

```json
"ClassifyIssuers": {
  "Type": "Task",
  "Resource": "arn:aws:states:::lambda:invoke",
  "Parameters": {
    "FunctionName": classifyArn,
    "Payload.$": "$.Payload"
  },
  "TimeoutSeconds": 300,
  "Retry": [],
  "Next": "ShouldSendReport"
},
```

Replace it with the Map state (using `classifyIssuerArn` which is the renamed variable):

```json
"ClassifyIssuers": {
  "Type": "Map",
  "ItemsPath": "$.Payload.unclassifiedIssuers",
  "Parameters": {
    "issuerName.$": "$$.Map.Item.Value"
  },
  "MaxConcurrency": 1,
  "Iterator": {
    "StartAt": "ClassifyIssuer",
    "States": {
      "ClassifyIssuer": {
        "Type": "Task",
        "Resource": "arn:aws:states:::lambda:invoke",
        "Parameters": {
          "FunctionName": classifyIssuerArn,
          "Payload.$": "$"
        },
        "OutputPath": "$.Payload",
        "TimeoutSeconds": 120,
        "End": true,
        "Catch": [
          {
            "ErrorEquals": ["States.ALL"],
            "ResultPath": "$.errorInfo",
            "Next": "HandleClassificationFailure"
          }
        ]
      },
      "HandleClassificationFailure": {
        "Type": "Pass",
        "Parameters": {
          "issuerName.$": "$.issuerName",
          "success": false,
          "errorReason.$": "$.errorInfo.Cause"
        },
        "End": true
      }
    }
  },
  "ResultPath": "$.Payload.classificationResults",
  "Next": "ShouldSendReport"
},
```

**Key design notes:**
- `OutputPath: "$.Payload"` extracts the Lambda's return value directly (the `ClassifyIssuerResult` object).
- `HandleClassificationFailure` mirrors `FundamentalAnalysisStateMachine`'s `HandleAnalysisFailure` pattern.
- `ResultPath: "$.Payload.classificationResults"` appends the array of per-issuer results to `$.Payload`, preserving existing fields (`newBonds`, `bondsDeactivated`, `unclassifiedIssuers`, etc.) for downstream `ShouldSendReport` and `SendReport` states.
- `MaxConcurrency: 1` — sequential execution to avoid hammering Bedrock/Tavily with concurrent requests. Can be increased later if rate limits allow.

- [ ] **Step 5.4: Verify TypeScript compiles**

```bash
cd /workspaces/CatalystViewer && pnpm tsc --noEmit 2>&1 | head -40
```

Expected: any errors should only be from the still-present `classifyIssuers.ts` (plural, deleted next step).

- [ ] **Step 5.5: Commit**

```bash
git add infra/updater.ts
git commit -m "feat: replace ClassifyIssuers batch with Map-based per-issuer classification"
```

---

### Task 6: Delete the old batch Lambda

**Files:**
- Delete: `packages/functions/src/issuers/classifyIssuers.ts`

- [ ] **Step 6.1: Delete the file**

```bash
rm /workspaces/CatalystViewer/packages/functions/src/issuers/classifyIssuers.ts
```

- [ ] **Step 6.2: Verify no remaining references**

```bash
grep -r "classifyIssuers" /workspaces/CatalystViewer/packages /workspaces/CatalystViewer/infra --include="*.ts" | grep -v node_modules
```

Expected: no output (no remaining references). If any exist, fix them.

- [ ] **Step 6.3: Final TypeScript check — zero errors**

```bash
cd /workspaces/CatalystViewer && pnpm tsc --noEmit 2>&1 | head -40
```

Expected: no errors across all packages.

- [ ] **Step 6.4: Also check infra compiles**

```bash
cd /workspaces/CatalystViewer && pnpm --filter @functions/src tsc --noEmit 2>&1 | head -40
```

- [ ] **Step 6.5: Commit**

```bash
git add -A packages/functions/src/issuers/classifyIssuers.ts
git commit -m "chore: remove obsolete batch classifyIssuers Lambda"
```

---

## Summary of Data Flow After Refactor

```
CollectUnclassifiedIssuers
  → returns { ..., unclassifiedIssuers: ["A","B",...] }  ← already capped

HasUnclassifiedIssuers (Choice)
  → if unclassifiedIssuers[0] present → ClassifyIssuers (Map)
  → else → ShouldSendReport

ClassifyIssuers (Map, MaxConcurrency=1)
  iterates over each issuer string in $.Payload.unclassifiedIssuers
  each iteration:
    ClassifyIssuer (Lambda, 5 min timeout)
      → success → { success: true, issuerName, industry, businessSummary, websiteUrl, modelId }
      → timeout/error → Catch → HandleClassificationFailure
                                  → { success: false, issuerName, errorReason }
  Map result stored in $.Payload.classificationResults

ShouldSendReport (Choice)
  → checks $.Payload.newBonds[0] | $.Payload.bondsDeactivated[0] | $.Payload.unclassifiedIssuers[0]
  → unchanged

SendReport (Lambda)
  receives $.Payload which now includes classificationResults: ClassifyIssuerResult[]
  splits into classifiedIssuers / failedIssuers for email template
```
