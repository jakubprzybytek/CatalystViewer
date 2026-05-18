# Display Issuer Analysis in UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface fundamental analysis scorecard in `IssuerCard` and provide access to the full markdown report via a modal dialog. On page load, all scorecards load alongside profiles (one request). The full report markdown is fetched lazily when the user opens the modal.

**Spec:** `docs/superpowers/specs/2026-05-18-display-analysis-in-ui-design.md`

**Tech Stack:** TypeScript, AWS Lambda, DynamoDB, SST v4, Next.js, MUI v7, react-markdown

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/core/src/storage/issuerProfiles/index.ts` | Modify | Add `DbIssuerAnalysisSummary` type |
| `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts` | Modify | Add `getAllLatestAnalysisSummaries()` method |
| `packages/functions/src/issuers/getIssuerProfiles.ts` | Modify | Parallel-fetch + merge analysis summaries |
| `packages/functions/src/issuers/getIssuerAnalysis.ts` | Create | New Lambda: return `reportMarkdown` for one issuer |
| `infra/api.ts` | Modify | Register new Lambda + route |
| `packages/web/src/sdk/Issuers.ts` | Modify | Extend `IssuerProfile`; add `getIssuerAnalysis()` |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuersList.tsx` | Modify | Extend `IssuerReport`; pass scorecard fields |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx` | Modify | Show scorecard + modal trigger in collapsible |
| `packages/web/src/components/BondReportsBrowser/issuers/AnalysisReportModal.tsx` | Create | MUI Dialog with lazy-loaded markdown report |
| `packages/web/package.json` | Modify | Add `react-markdown` dependency |

---

## Task 1 — Storage type: `DbIssuerAnalysisSummary`

**File:** `packages/core/src/storage/issuerProfiles/index.ts`

- [ ] **Step 1: Add `DbIssuerAnalysisSummary` type**

Add after `DbIssuerAnalysisRecord`:

```ts
export type DbIssuerAnalysisSummary = {
    issuerName: string;
    performedAt: string;
    performedAtTs: number;
    scorecard?: FundamentalScorecard;
};
```

---

## Task 2 — Storage method: `getAllLatestAnalysisSummaries()`

**File:** `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts`

- [ ] **Step 1: Import `DbIssuerAnalysisSummary`**

Extend the existing import:
```ts
import { DbIssuerProfileRecord, DbIssuerAnalysisRecord, DbIssuerAnalysisSummary } from '.';
```

- [ ] **Step 2: Add `getAllLatestAnalysisSummaries()` method**

Add after `getAllLatestAnalyses()`:

```ts
async getAllLatestAnalysisSummaries(): Promise<DbIssuerAnalysisSummary[]> {
    console.log('IssuerProfilesTable: Fetching all latest analysis summaries');

    const startTimestamp = new Date().getTime();

    const scanCommand = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'recordType = :rt',
        ExpressionAttributeValues: { ':rt': '#LATEST_ANALYSIS' },
        ProjectionExpression: 'issuerName, performedAt, performedAtTs, scorecard',
    });

    const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
    const endTimestamp = new Date().getTime();
    console.log(`IssuerProfilesTable: Returning ${result.Count ?? 0} analysis summaries in ${endTimestamp - startTimestamp} ms.`);

    return result.Items ? result.Items as DbIssuerAnalysisSummary[] : [];
}
```

---

## Task 3 — Lambda: extend `getIssuerProfiles`

**File:** `packages/functions/src/issuers/getIssuerProfiles.ts`

- [ ] **Step 1: Fetch profiles and summaries in parallel, join, and return**

Replace the current handler body:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const [issuerProfiles, analysisSummaries] = await Promise.all([
        issuerProfilesTable.getProfiles(),
        issuerProfilesTable.getAllLatestAnalysisSummaries(),
    ]);

    const analysisByIssuer = new Map(analysisSummaries.map(s => [s.issuerName, s]));

    const mergedProfiles = issuerProfiles.map(profile => ({
        ...profile,
        scorecard: analysisByIssuer.get(profile.issuerName)?.scorecard,
        performedAt: analysisByIssuer.get(profile.issuerName)?.performedAt,
    }));

    return Success({ issuerProfiles: mergedProfiles });
});
```

---

## Task 4 — Lambda: create `getIssuerAnalysis`

**File:** `packages/functions/src/issuers/getIssuerAnalysis.ts` _(new file)_

- [ ] **Step 1: Create the handler**

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { lambdaHandler, Success, NotFound } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async (event) => {
    const issuerName = decodeURIComponent(event.pathParameters?.name ?? '');

    if (!issuerName) {
        return NotFound();
    }

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const analysis = await issuerProfilesTable.getLatestAnalysis(issuerName);

    if (!analysis) {
        return NotFound();
    }

    return Success({ reportMarkdown: analysis.reportMarkdown ?? '' });
});
```

> Check `HandlerProxy.ts` for the exact `NotFound` export — if it does not exist, return HTTP 404 manually via the proxy's error conventions.

---

## Task 5 — Infra: register new Lambda and route

**File:** `infra/api.ts`

- [ ] **Step 1: Add `getIssuerAnalysisFunction`**

Add after `getIssuerProfilesFunction`:

```ts
const getIssuerAnalysisFunction = new sst.aws.Function("GetIssuerAnalysis", {
  handler: "packages/functions/src/issuers/getIssuerAnalysis.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerProfilesTable],
});
```

- [ ] **Step 2: Add route**

Add after `api.route("GET /api/issuers/profiles", ...)`:

```ts
api.route("GET /api/issuers/{name}/analysis", getIssuerAnalysisFunction.arn, jwtAuth);
```

---

## Task 6 — SDK: extend `Issuers.ts`

**File:** `packages/web/src/sdk/Issuers.ts`

- [ ] **Step 1: Import `FundamentalScorecard`**

Add import at the top:

```ts
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';
```

- [ ] **Step 2: Extend `IssuerProfile`**

Add two optional fields:

```ts
export type IssuerProfile = {
  issuerName: string;
  industry: string;
  businessSummary: string;
  websiteUrl?: string;
  classifiedAtTs?: number;
  scorecard?: FundamentalScorecard;
  performedAt?: string;
};
```

- [ ] **Step 3: Add `getIssuerAnalysis()` function**

Add after `getIssuerProfiles()`:

```ts
const ISSUER_ANALYSIS_PATH = (name: string) => `/api/issuers/${encodeURIComponent(name)}/analysis`;

type IssuerAnalysisQueryResult = {
  reportMarkdown: string;
};

export async function getIssuerAnalysis(issuerName: string): Promise<string> {
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path: ISSUER_ANALYSIS_PATH(issuerName),
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;

  const result = (await response.body.json()) as unknown as IssuerAnalysisQueryResult;
  return result.reportMarkdown;
}
```

---

## Task 7 — Frontend: extend `IssuersList`

**File:** `packages/web/src/components/BondReportsBrowser/issuers/IssuersList.tsx`

- [ ] **Step 1: Import `FundamentalScorecard`**

Add import:

```ts
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';
```

- [ ] **Step 2: Extend `IssuerReport` type**

Add two optional fields:

```ts
export type IssuerReport = {
  // ... existing fields ...
  scorecard?: FundamentalScorecard;
  performedAt?: string;
}
```

- [ ] **Step 3: Pass scorecard fields when building `IssuerReport`**

In the `issuerReports.push({...})` call inside the `useMemo`, add:

```ts
scorecard: issuerProfile?.scorecard,
performedAt: issuerProfile?.performedAt,
```

---

## Task 8 — Frontend: wire `IssuerCard`

**File:** `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`

- [ ] **Step 1: Import `IssuerScorecard` and `AnalysisReportModal`**

Add imports:

```ts
import IssuerScorecard from './IssuerScorecard';
import AnalysisReportModal from './AnalysisReportModal';
```

- [ ] **Step 2: Add `modalOpen` state**

Add inside the component, after the existing `expanded` state:

```ts
const [modalOpen, setModalOpen] = useState(false);
```

- [ ] **Step 3: Expand the expand-button visibility condition**

The expand button is currently shown when `issuerReport.businessSummary || issuerReport.websiteUrl`. Extend to also show it when `issuerReport.scorecard` is present:

```ts
{(issuerReport.businessSummary || issuerReport.websiteUrl || issuerReport.scorecard) && (
  <IconButton size='small' onClick={() => setExpanded(!expanded)}>
    {expanded ? <ExpandLessOutlinedIcon /> : <ExpandMoreOutlinedIcon />}
  </IconButton>
)}
```

- [ ] **Step 4: Extend `Collapse` condition**

Change the condition in the `Collapse` `in` prop to:

```ts
<Collapse in={expanded && !!(issuerReport.businessSummary || issuerReport.websiteUrl || issuerReport.scorecard)}>
```

- [ ] **Step 5: Add scorecard row and report link inside `Collapse`**

Add after the `classifiedAtTs` block, still inside `Collapse`:

```tsx
{issuerReport.scorecard && (
  <>
    <CardSectionRow>
      <IssuerScorecard scorecard={issuerReport.scorecard} />
    </CardSectionRow>
    {issuerReport.performedAt && (
      <Typography component='span' className='tiny-text'>
        Analysed: {new Date(issuerReport.performedAt).toLocaleString('pl-PL')}{' '}
        <Box
          component='span'
          onClick={() => setModalOpen(true)}
          sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Full report →
        </Box>
      </Typography>
    )}
  </>
)}
```

- [ ] **Step 6: Render `AnalysisReportModal` after `</Paper>`**

Add immediately after the closing `</Paper>` tag and before the closing `<>` fragment:

```tsx
<AnalysisReportModal
  issuerName={issuerReport.name}
  open={modalOpen}
  onClose={() => setModalOpen(false)}
/>
```

> Note: `IssuerCard` is wrapped in `memo()`. The modal renders outside `Paper` to avoid stacking-context issues.

---

## Task 9 — Frontend: create `AnalysisReportModal`

**File:** `packages/web/src/components/BondReportsBrowser/issuers/AnalysisReportModal.tsx` _(new file)_

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import Markdown from 'react-markdown';
import { getIssuerAnalysis } from '@/sdk/Issuers';

type AnalysisReportModalProps = {
  issuerName: string;
  open: boolean;
  onClose: () => void;
};

export default function AnalysisReportModal({ issuerName, open, onClose }: AnalysisReportModalProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setReportMarkdown(null);
    getIssuerAnalysis(issuerName)
      .then(md => setReportMarkdown(md))
      .catch(() => setError('Failed to load report. Please try again.'))
      .finally(() => setLoading(false));
  }, [open, issuerName]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth scroll='paper'>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {issuerName}
        <IconButton size='small' onClick={onClose} aria-label='close'>
          <CloseOutlinedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color='error'>{error}</Typography>
        )}
        {reportMarkdown !== null && !loading && (
          <Box sx={{ '& h1,h2,h3': { mt: 2, mb: 1 }, '& p': { my: 0.5 }, '& ul': { pl: 2 } }}>
            <Markdown>{reportMarkdown}</Markdown>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Task 10 — Add `react-markdown` dependency

**File:** `packages/web/package.json`

- [ ] **Step 1: Add `react-markdown` to dependencies**

```json
"react-markdown": "^9.0.1"
```

- [ ] **Step 2: Install**

Run from workspace root:

```sh
pnpm install
```

---

## Verification

After all tasks are implemented, verify:

- [ ] TypeScript compiles without errors (`pnpm -r tsc --noEmit`)
- [ ] `getIssuerProfiles` returns `scorecard` and `performedAt` for issuers that have analysis records
- [ ] `IssuerCard` shows `IssuerScorecard` and "Analysed" line for issuers with a scorecard
- [ ] Clicking "Full report →" opens the modal and renders markdown
- [ ] Issuers without analysis show no scorecard and no report link
- [ ] Modal close button works
