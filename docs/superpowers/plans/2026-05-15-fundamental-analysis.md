# Fundamental Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 6-dimension risk scorecard for corporate bond issuers, storing per-issuer annual financials in DynamoDB and displaying traffic-light signals in IssuerCard.

**Architecture:** Financial data (one record per issuer per year) is stored in a new DynamoDB table. A Lambda/API endpoint returns all records to the frontend. The frontend computes the scorecard signals (pure arithmetic) and renders a 6-row traffic-light card inside the existing IssuerCard expand section.

**Tech Stack:** TypeScript, AWS DynamoDB + SST v3, AWS Lambda, Next.js, MUI v7, Vitest

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/core/src/storage/issuerFinancials/index.ts` | Create | `DbIssuerFinancials` DB type + re-export |
| `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts` | Create | DynamoDB table class |
| `infra/storage.ts` | Modify | Add `issuerFinancialsTable` Dynamo resource |
| `infra/api.ts` | Modify | Add `getIssuerFinancials` Lambda + API route |
| `packages/functions/src/issuers/getIssuerFinancials.ts` | Create | GET /api/issuers/financials handler |
| `packages/web/src/sdk/Issuers.ts` | Modify | Add `FinancialYear` type + `getIssuerFinancials()` |
| `packages/web/src/bonds/fundamentals/scorecard.ts` | Create | Signal types + `computeScorecard()` |
| `packages/web/src/bonds/fundamentals/scorecard.test.ts` | Create | Unit tests for scorecard logic |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx` | Create | Scorecard display component |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx` | Modify | Wire in IssuerScorecard |
| `packages/web/src/components/BondReportsBrowser/issuers/IssuersList.tsx` | Modify | Pass financials per issuer to IssuerCard |
| `packages/web/src/components/BondReportsBrowser/index.tsx` | Modify | Fetch financials + pass to IssuersList |
| `scripts/store-issuer-financials/store-issuer-financials.ts` | Create | CLI script to ingest financials JSON into DynamoDB |
| `scripts/store-issuer-financials/package.json` | Create | Script package manifest |
| `scripts/store-issuer-financials/tsconfig.json` | Create | Script tsconfig |
| `scripts/store-issuer-financials/sst-env.d.ts` | Create | SST env reference |

---

## Task 1: Storage — DbIssuerFinancials type and Table class

**Files:**
- Create: `packages/core/src/storage/issuerFinancials/index.ts`
- Create: `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts`

- [ ] **Step 1: Create the DB type + index**

Create `packages/core/src/storage/issuerFinancials/index.ts`:

```ts
export * from './IssuerFinancialsTable';

export type DbIssuerFinancials = {
    issuerName: string;       // PK
    year: number;             // SK
    revenue?: number;
    ebit?: number;
    depreciation?: number;    // D&A — used to compute EBITDA = ebit + depreciation
    interestExpense?: number;
    netProfit?: number;
    totalAssets?: number;
    intangibleAssets?: number;
    equity?: number;
    financialDebt?: number;
    cash?: number;
    currentAssets?: number;
    inventory?: number;
    currentLiabilities?: number;
};
```

- [ ] **Step 2: Create the Table class**

Create `packages/core/src/storage/issuerFinancials/IssuerFinancialsTable.ts`:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DbIssuerFinancials } from '.';
import { scanAll } from '../utils';

export class IssuerFinancialsTable {
    readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
    readonly tableName: string;

    constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
        this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true }
        });
        this.tableName = tableName;
    }

    async getAll(): Promise<DbIssuerFinancials[]> {
        console.log('IssuerFinancialsTable: Fetching all issuer financials');

        const startTimestamp = new Date().getTime();

        const scanCommand = new ScanCommand({
            TableName: this.tableName,
        });

        const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
        const endTimestamp = new Date().getTime();
        console.log(`IssuerFinancialsTable: Returning ${result.Count ?? 0} records in ${endTimestamp - startTimestamp} ms.`);

        return result.Items ? result.Items as DbIssuerFinancials[] : [];
    }

    async getByIssuer(issuerName: string): Promise<DbIssuerFinancials[]> {
        console.log(`IssuerFinancialsTable: Fetching financials for '${issuerName}'`);

        const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'issuerName = :name',
            ExpressionAttributeValues: { ':name': issuerName },
        }));

        return result.Items ? result.Items as DbIssuerFinancials[] : [];
    }

    async store(financials: DbIssuerFinancials): Promise<void> {
        console.log(`IssuerFinancialsTable: Storing financials for '${financials.issuerName}' year ${financials.year}`);

        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: financials,
        }));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/storage/issuerFinancials/
git commit -m "feat: add DbIssuerFinancials type and IssuerFinancialsTable"
```

---

## Task 2: Infra — DynamoDB table + Lambda + API route

**Files:**
- Modify: `infra/storage.ts`
- Modify: `infra/api.ts`

- [ ] **Step 1: Add the DynamoDB table to storage.ts**

In `infra/storage.ts`, append after the `issuerProfilesTable` block:

```ts
export const issuerFinancialsTable = new sst.aws.Dynamo("IssuerFinancials", {
  fields: {
    issuerName: "string",
    year: "number",
  },
  primaryIndex: {
    hashKey: "issuerName",
    rangeKey: "year",
  },
});
```

- [ ] **Step 2: Add import and Lambda + route to api.ts**

In `infra/api.ts`, add `issuerFinancialsTable` to the import at line 1:

```ts
import { profilesTable, bondDetailsTable, bondStatisticsTable, issuerProfilesTable, issuerFinancialsTable } from "./storage";
```

Add the Lambda function after `getIssuerProfilesFunction`:

```ts
const getIssuerFinancialsFunction = new sst.aws.Function("GetIssuerFinancials", {
  handler: "packages/functions/src/issuers/getIssuerFinancials.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerFinancialsTable],
});
```

Add the route after `api.route("GET /api/issuers/profiles", ...)`:

```ts
api.route("GET /api/issuers/financials", getIssuerFinancialsFunction.arn, jwtAuth);
```

- [ ] **Step 3: Commit**

```bash
git add infra/storage.ts infra/api.ts
git commit -m "feat: add IssuerFinancials DynamoDB table and API route"
```

---

## Task 3: Lambda handler

**Files:**
- Create: `packages/functions/src/issuers/getIssuerFinancials.ts`

- [ ] **Step 1: Create the handler**

Create `packages/functions/src/issuers/getIssuerFinancials.ts`:

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerFinancialsTable } from '@core/storage/issuerFinancials';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async () => {
    const issuerFinancialsTable = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);
    const financials = await issuerFinancialsTable.getAll();

    return Success({ financials });
});
```

- [ ] **Step 2: Commit**

```bash
git add packages/functions/src/issuers/getIssuerFinancials.ts
git commit -m "feat: add getIssuerFinancials Lambda handler"
```

---

## Task 4: Web SDK — FinancialYear type and API client

**Files:**
- Modify: `packages/web/src/sdk/Issuers.ts`

- [ ] **Step 1: Add FinancialYear type and getIssuerFinancials function**

Append to `packages/web/src/sdk/Issuers.ts` after the `getIssuerProfiles` function:

```ts
export type FinancialYear = {
  issuerName: string;
  year: number;
  revenue?: number;
  ebit?: number;
  depreciation?: number;
  interestExpense?: number;
  netProfit?: number;
  totalAssets?: number;
  intangibleAssets?: number;
  equity?: number;
  financialDebt?: number;
  cash?: number;
  currentAssets?: number;
  inventory?: number;
  currentLiabilities?: number;
};

type IssuerFinancialsQueryResult = {
  financials: FinancialYear[];
};

export async function getIssuerFinancials(): Promise<FinancialYear[]> {
  try {
    const session = await fetchAuthSession();
    const response = await get({
      apiName: 'api',
      path: '/api/issuers/financials',
      options: {
        headers: {
          Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
        },
      },
    }).response;

    const result = (await response.body.json()) as unknown as IssuerFinancialsQueryResult;
    return result.financials ?? [];
  } catch (error) {
    console.log(error);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/sdk/Issuers.ts
git commit -m "feat: add FinancialYear type and getIssuerFinancials SDK function"
```

---

## Task 5: Scorecard computation engine with tests

**Files:**
- Create: `packages/web/src/bonds/fundamentals/scorecard.ts`
- Create: `packages/web/src/bonds/fundamentals/scorecard.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/web/src/bonds/fundamentals/scorecard.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeScorecard } from './scorecard';
import type { FinancialYear } from '@/sdk/Issuers';

// Example A from the design spec — low risk, all data present
const exampleA: FinancialYear[] = [
  { issuerName: 'Polmech', year: 2024, revenue: 48200, ebit: 5100, depreciation: 2700, interestExpense: 1200, netProfit: 2900, totalAssets: 42000, intangibleAssets: 800, equity: 18500, financialDebt: 14000, cash: 3200, currentAssets: 16000, inventory: 4500, currentLiabilities: 9800 },
  { issuerName: 'Polmech', year: 2023, revenue: 43500, ebit: 4600, depreciation: 2500, interestExpense: 1200, netProfit: 2700, totalAssets: 40000, intangibleAssets: 800, equity: 17000, financialDebt: 14200, cash: 2800, currentAssets: 15000, inventory: 4400, currentLiabilities: 9500 },
  { issuerName: 'Polmech', year: 2022, revenue: 39800, ebit: 4100, depreciation: 2400, interestExpense: 1150, netProfit: 2300, totalAssets: 38500, intangibleAssets: 850, equity: 15500, financialDebt: 14500, cash: 2200, currentAssets: 13800, inventory: 4400, currentLiabilities: 9200 },
  { issuerName: 'Polmech', year: 2021, revenue: 35200, ebit: 3400, depreciation: 2400, interestExpense: 1100, netProfit: 1800, totalAssets: 36000, intangibleAssets: 900, equity: 13500, financialDebt: 14800, cash: 1800, currentAssets: 12500, inventory: 4300, currentLiabilities: 8800 },
  { issuerName: 'Polmech', year: 2020, revenue: 31400, ebit: 2900, depreciation: 2200, interestExpense: 1100, netProfit: 1400, totalAssets: 34000, intangibleAssets: 900, equity: 12000, financialDebt: 15000, cash: 1500, currentAssets: 11000, inventory: 4200, currentLiabilities: 8500 },
];

// Example B from the design spec — high risk
const exampleB: FinancialYear[] = [
  { issuerName: 'Budmax', year: 2024, revenue: 61000, ebit: 1800, depreciation: 1600, interestExpense: 1600, netProfit: 100, totalAssets: 55000, intangibleAssets: 1200, equity: 8000, financialDebt: 28000, cash: 900, currentAssets: 22000, inventory: 3000, currentLiabilities: 24000 },
  { issuerName: 'Budmax', year: 2023, revenue: 63000, ebit: 2400, depreciation: 1800, interestExpense: 1500, netProfit: 400, totalAssets: 53500, intangibleAssets: 1200, equity: 9500, financialDebt: 26500, cash: 1200, currentAssets: 22000, inventory: 2900, currentLiabilities: 23000 },
  { issuerName: 'Budmax', year: 2022, revenue: 65200, ebit: 3100, depreciation: 1900, interestExpense: 1400, netProfit: 900, totalAssets: 52000, intangibleAssets: 1100, equity: 12500, financialDebt: 24000, cash: 1500, currentAssets: 22000, inventory: 2800, currentLiabilities: 21500 },
  { issuerName: 'Budmax', year: 2021, revenue: 68500, ebit: 3800, depreciation: 1800, interestExpense: 1300, netProfit: 1500, totalAssets: 50000, intangibleAssets: 1100, equity: 13000, financialDebt: 21000, cash: 1800, currentAssets: 22500, inventory: 2700, currentLiabilities: 19500 },
  { issuerName: 'Budmax', year: 2020, revenue: 71000, ebit: 4200, depreciation: 1800, interestExpense: 1200, netProfit: 2100, totalAssets: 48000, intangibleAssets: 1000, equity: 12500, financialDebt: 18000, cash: 2000, currentAssets: 22000, inventory: 2500, currentLiabilities: 18000 },
];

describe('computeScorecard', () => {
  describe('Dimension 1 — Debt Burden', () => {
    it('D/E: green when < 1.0', () => {
      // Polmech current year: 14000 / 18500 = 0.76
      const sc = computeScorecard(exampleA);
      const d1 = sc.dimensions.find(d => d.name === 'Debt Burden')!;
      const de = d1.metrics.find(m => m.name === 'D/E')!;
      expect(de.value).toBeCloseTo(0.757, 2);
      expect(de.signal).toBe('green');
    });

    it('D/E: red when > 2.0', () => {
      // Budmax current year: 28000 / 8000 = 3.5
      const sc = computeScorecard(exampleB);
      const d1 = sc.dimensions.find(d => d.name === 'Debt Burden')!;
      const de = d1.metrics.find(m => m.name === 'D/E')!;
      expect(de.value).toBeCloseTo(3.5, 1);
      expect(de.signal).toBe('red');
    });

    it('Net Debt/EBITDA: green when < 2.5', () => {
      // Polmech: (14000 - 3200) / (5100 + 2700) = 10800 / 7800 = 1.38
      const sc = computeScorecard(exampleA);
      const d1 = sc.dimensions.find(d => d.name === 'Debt Burden')!;
      const ndEbitda = d1.metrics.find(m => m.name === 'Net Debt/EBITDA')!;
      expect(ndEbitda.value).toBeCloseTo(1.385, 2);
      expect(ndEbitda.signal).toBe('green');
    });

    it('Net Debt/EBITDA: red when > 4.0', () => {
      // Budmax: (28000 - 900) / (1800 + 1600) = 27100 / 3400 = 7.97
      const sc = computeScorecard(exampleB);
      const d1 = sc.dimensions.find(d => d.name === 'Debt Burden')!;
      const ndEbitda = d1.metrics.find(m => m.name === 'Net Debt/EBITDA')!;
      expect(ndEbitda.value).toBeCloseTo(7.97, 1);
      expect(ndEbitda.signal).toBe('red');
    });
  });

  describe('Dimension 2 — Debt Service', () => {
    it('ICR: green when > 3.0', () => {
      // Polmech: 5100 / 1200 = 4.25
      const sc = computeScorecard(exampleA);
      const d2 = sc.dimensions.find(d => d.name === 'Debt Service')!;
      const icr = d2.metrics.find(m => m.name === 'ICR')!;
      expect(icr.value).toBeCloseTo(4.25, 2);
      expect(icr.signal).toBe('green');
    });

    it('ICR: red when < 1.5', () => {
      // Budmax: 1800 / 1600 = 1.125
      const sc = computeScorecard(exampleB);
      const d2 = sc.dimensions.find(d => d.name === 'Debt Service')!;
      const icr = d2.metrics.find(m => m.name === 'ICR')!;
      expect(icr.value).toBeCloseTo(1.125, 2);
      expect(icr.signal).toBe('red');
    });
  });

  describe('Dimension 3 — Liquidity', () => {
    it('Current Ratio: green when > 1.5', () => {
      // Polmech: 16000 / 9800 = 1.63
      const sc = computeScorecard(exampleA);
      const d3 = sc.dimensions.find(d => d.name === 'Liquidity')!;
      const cr = d3.metrics.find(m => m.name === 'Current Ratio')!;
      expect(cr.value).toBeCloseTo(1.633, 2);
      expect(cr.signal).toBe('green');
    });

    it('Current Ratio: red when < 1.0', () => {
      // Budmax: 22000 / 24000 = 0.917
      const sc = computeScorecard(exampleB);
      const d3 = sc.dimensions.find(d => d.name === 'Liquidity')!;
      const cr = d3.metrics.find(m => m.name === 'Current Ratio')!;
      expect(cr.value).toBeCloseTo(0.917, 2);
      expect(cr.signal).toBe('red');
    });

    it('Quick Ratio: yellow when 0.8–1.2', () => {
      // Polmech: (16000 - 4500) / 9800 = 11500 / 9800 = 1.173
      const sc = computeScorecard(exampleA);
      const d3 = sc.dimensions.find(d => d.name === 'Liquidity')!;
      const qr = d3.metrics.find(m => m.name === 'Quick Ratio')!;
      expect(qr.value).toBeCloseTo(1.173, 2);
      expect(qr.signal).toBe('yellow');
    });
  });

  describe('Dimension 4 — Profitability', () => {
    it('EBIT Margin: green when > 10%', () => {
      // Polmech: 5100 / 48200 = 10.58%
      const sc = computeScorecard(exampleA);
      const d4 = sc.dimensions.find(d => d.name === 'Profitability')!;
      const em = d4.metrics.find(m => m.name === 'EBIT Margin')!;
      expect(em.value).toBeCloseTo(0.1058, 3);
      expect(em.signal).toBe('green');
    });

    it('EBIT Margin: yellow when 5–10%', () => {
      // Budmax: 1800 / 61000 = 2.95% → red
      // We need a yellow case: ebit = 3700, revenue = 61000 → 6.1%
      const yellowYear: FinancialYear[] = [{
        issuerName: 'Test', year: 2024,
        revenue: 61000, ebit: 3700, depreciation: 1000,
        interestExpense: 500, netProfit: 2000,
        totalAssets: 50000, intangibleAssets: 500,
        equity: 20000, financialDebt: 10000, cash: 2000,
        currentAssets: 15000, inventory: 2000, currentLiabilities: 10000,
      }];
      const sc = computeScorecard(yellowYear);
      const d4 = sc.dimensions.find(d => d.name === 'Profitability')!;
      const em = d4.metrics.find(m => m.name === 'EBIT Margin')!;
      expect(em.signal).toBe('yellow');
    });

    it('Net Margin: red when < 1%', () => {
      // Budmax: 100 / 61000 = 0.16%
      const sc = computeScorecard(exampleB);
      const d4 = sc.dimensions.find(d => d.name === 'Profitability')!;
      const nm = d4.metrics.find(m => m.name === 'Net Margin')!;
      expect(nm.value).toBeCloseTo(0.00164, 4);
      expect(nm.signal).toBe('red');
    });
  });

  describe('Dimension 5 — Asset Coverage', () => {
    it('Asset Coverage Ratio: green when > 1.5', () => {
      // Polmech: (42000 - 800 - 9800) / 14000 = 31400 / 14000 = 2.24
      const sc = computeScorecard(exampleA);
      const d5 = sc.dimensions.find(d => d.name === 'Asset Coverage')!;
      const acr = d5.metrics.find(m => m.name === 'Asset Coverage Ratio')!;
      expect(acr.value).toBeCloseTo(2.243, 2);
      expect(acr.signal).toBe('green');
    });

    it('Equity Ratio: red when < 15%', () => {
      // Budmax: 8000 / 55000 = 14.5%
      const sc = computeScorecard(exampleB);
      const d5 = sc.dimensions.find(d => d.name === 'Asset Coverage')!;
      const er = d5.metrics.find(m => m.name === 'Equity Ratio')!;
      expect(er.value).toBeCloseTo(0.1455, 3);
      expect(er.signal).toBe('red');
    });
  });

  describe('Dimension 6 — Financial Trend', () => {
    it('Revenue CAGR: green for Polmech (>5% growth)', () => {
      const sc = computeScorecard(exampleA);
      const d6 = sc.dimensions.find(d => d.name === 'Financial Trend')!;
      const cagr = d6.metrics.find(m => m.name === 'Revenue CAGR')!;
      // (48200/31400)^(1/4) - 1 ≈ 11.3%
      expect(cagr.value).toBeGreaterThan(0.05);
      expect(cagr.signal).toBe('green');
    });

    it('Revenue CAGR: red for Budmax (shrinking)', () => {
      const sc = computeScorecard(exampleB);
      const d6 = sc.dimensions.find(d => d.name === 'Financial Trend')!;
      const cagr = d6.metrics.find(m => m.name === 'Revenue CAGR')!;
      // (61000/71000)^(1/4) - 1 ≈ -3.7%
      expect(cagr.value).toBeLessThan(0);
      expect(cagr.signal).toBe('red');
    });

    it('returns na signal when fewer than 3 years of data', () => {
      const twoYears = exampleA.slice(0, 2);
      const sc = computeScorecard(twoYears);
      const d6 = sc.dimensions.find(d => d.name === 'Financial Trend')!;
      expect(d6.signal).toBe('na');
    });
  });

  describe('overall scorecard', () => {
    it('Polmech has no red dimensions', () => {
      const sc = computeScorecard(exampleA);
      const redDimensions = sc.dimensions.filter(d => d.signal === 'red');
      expect(redDimensions).toHaveLength(0);
    });

    it('Budmax has multiple red dimensions', () => {
      const sc = computeScorecard(exampleB);
      const redDimensions = sc.dimensions.filter(d => d.signal === 'red');
      expect(redDimensions.length).toBeGreaterThanOrEqual(4);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /workspaces/CatalystViewer && npx vitest run packages/web/src/bonds/fundamentals/scorecard.test.ts
```

Expected: FAIL — `Cannot find module './scorecard'`

- [ ] **Step 3: Implement the scorecard engine**

Create `packages/web/src/bonds/fundamentals/scorecard.ts`:

```ts
import type { FinancialYear } from '@/sdk/Issuers';

export type Signal = 'green' | 'yellow' | 'red' | 'na';

export type MetricResult = {
  name: string;
  value: number | null;
  formattedValue: string;
  signal: Signal;
};

export type DimensionResult = {
  name: string;
  signal: Signal;
  metrics: MetricResult[];
};

export type FundamentalScorecard = {
  dimensions: DimensionResult[];
};

// ─── Signal helpers ────────────────────────────────────────────────────────────

function signalFromValue(
  value: number | null | undefined,
  greenFn: (v: number) => boolean,
  yellowFn: (v: number) => boolean,
): Signal {
  if (value == null || !isFinite(value)) return 'na';
  if (greenFn(value)) return 'green';
  if (yellowFn(value)) return 'yellow';
  return 'red';
}

function div(a: number | undefined, b: number | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function pct(value: number | null): string {
  if (value == null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function mult(value: number | null, decimals = 2): string {
  if (value == null) return 'n/a';
  return `${value.toFixed(decimals)}×`;
}

// ─── Dimension 1 — Debt Burden ────────────────────────────────────────────────

function computeDebtBurden(year: FinancialYear): DimensionResult {
  const de = div(year.financialDebt, year.equity);
  const ebitda = year.ebit != null && year.depreciation != null
    ? year.ebit + year.depreciation
    : undefined;
  const netDebt = year.financialDebt != null && year.cash != null
    ? year.financialDebt - year.cash
    : undefined;
  const ndEbitda = div(netDebt, ebitda);

  const deMetric: MetricResult = {
    name: 'D/E',
    value: de,
    formattedValue: mult(de),
    signal: signalFromValue(de, v => v < 1.0, v => v <= 2.0),
  };
  const ndMetric: MetricResult = {
    name: 'Net Debt/EBITDA',
    value: ndEbitda,
    formattedValue: mult(ndEbitda),
    signal: signalFromValue(ndEbitda, v => v < 2.5, v => v <= 4.0),
  };

  const metrics = [deMetric, ndMetric];
  return { name: 'Debt Burden', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 2 — Debt Service ───────────────────────────────────────────────

function computeDebtService(year: FinancialYear): DimensionResult {
  const icr = div(year.ebit, year.interestExpense);

  const icrMetric: MetricResult = {
    name: 'ICR',
    value: icr,
    formattedValue: mult(icr),
    signal: signalFromValue(icr, v => v > 3.0, v => v >= 1.5),
  };

  return { name: 'Debt Service', signal: worstSignal([icrMetric]), metrics: [icrMetric] };
}

// ─── Dimension 3 — Liquidity ──────────────────────────────────────────────────

function computeLiquidity(year: FinancialYear): DimensionResult {
  const cr = div(year.currentAssets, year.currentLiabilities);
  const liquidAssets = year.currentAssets != null && year.inventory != null
    ? year.currentAssets - year.inventory
    : undefined;
  const qr = div(liquidAssets, year.currentLiabilities);

  const crMetric: MetricResult = {
    name: 'Current Ratio',
    value: cr,
    formattedValue: mult(cr),
    signal: signalFromValue(cr, v => v > 1.5, v => v >= 1.0),
  };
  const qrMetric: MetricResult = {
    name: 'Quick Ratio',
    value: qr,
    formattedValue: mult(qr),
    signal: signalFromValue(qr, v => v > 1.2, v => v >= 0.8),
  };

  const metrics = [crMetric, qrMetric];
  return { name: 'Liquidity', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 4 — Profitability ──────────────────────────────────────────────

function computeProfitability(year: FinancialYear): DimensionResult {
  const ebitMargin = div(year.ebit, year.revenue);
  const netMargin = div(year.netProfit, year.revenue);

  const emMetric: MetricResult = {
    name: 'EBIT Margin',
    value: ebitMargin,
    formattedValue: pct(ebitMargin),
    signal: signalFromValue(ebitMargin, v => v > 0.10, v => v >= 0.05),
  };
  const nmMetric: MetricResult = {
    name: 'Net Margin',
    value: netMargin,
    formattedValue: pct(netMargin),
    signal: signalFromValue(netMargin, v => v > 0.05, v => v >= 0.01),
  };

  const metrics = [emMetric, nmMetric];
  return { name: 'Profitability', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 5 — Asset Coverage ────────────────────────────────────────────

function computeAssetCoverage(year: FinancialYear): DimensionResult {
  const tangibleNetAssets =
    year.totalAssets != null && year.intangibleAssets != null && year.currentLiabilities != null
      ? year.totalAssets - year.intangibleAssets - year.currentLiabilities
      : undefined;
  const acr = div(tangibleNetAssets, year.financialDebt);
  const equityRatio = div(year.equity, year.totalAssets);

  const acrMetric: MetricResult = {
    name: 'Asset Coverage Ratio',
    value: acr,
    formattedValue: mult(acr),
    signal: signalFromValue(acr, v => v > 1.5, v => v >= 1.0),
  };
  const erMetric: MetricResult = {
    name: 'Equity Ratio',
    value: equityRatio,
    formattedValue: pct(equityRatio),
    signal: signalFromValue(equityRatio, v => v > 0.30, v => v >= 0.15),
  };

  const metrics = [acrMetric, erMetric];
  return { name: 'Asset Coverage', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 6 — Financial Trend ───────────────────────────────────────────

function cagr(oldest: number, newest: number, periods: number): number | null {
  if (oldest <= 0 || periods === 0) return null;
  return Math.pow(newest / oldest, 1 / periods) - 1;
}

function linearSlope(values: number[]): number {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function computeTrend(years: FinancialYear[]): DimensionResult {
  if (years.length < 3) {
    const naMetric = (name: string): MetricResult => ({ name, value: null, formattedValue: 'n/a', signal: 'na' });
    const metrics = [naMetric('Revenue CAGR'), naMetric('EBITDA Margin Trend'), naMetric('Net Debt/EBITDA Trend')];
    return { name: 'Financial Trend', signal: 'na', metrics };
  }

  // years sorted descending by year (newest first)
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const newest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const periods = sorted.length - 1;

  // Revenue CAGR
  const revCagrValue = newest.revenue != null && oldest.revenue != null
    ? cagr(oldest.revenue, newest.revenue, periods)
    : null;
  const revCagrMetric: MetricResult = {
    name: 'Revenue CAGR',
    value: revCagrValue,
    formattedValue: pct(revCagrValue),
    signal: signalFromValue(revCagrValue, v => v > 0.05, v => v >= 0),
  };

  // EBITDA Margin Trend (slope of EBITDA/revenue across years, sorted ascending)
  const ebitdaMargins = sorted
    .slice()
    .reverse() // oldest first for slope
    .map(y => y.ebit != null && y.depreciation != null && y.revenue != null && y.revenue > 0
      ? (y.ebit + y.depreciation) / y.revenue
      : null)
    .filter((v): v is number => v !== null);

  let ebitdaMarginSignal: Signal = 'na';
  let ebitdaSlopeValue: number | null = null;
  if (ebitdaMargins.length >= 3) {
    ebitdaSlopeValue = linearSlope(ebitdaMargins);
    const latestMargin = ebitdaMargins[ebitdaMargins.length - 1];
    if (ebitdaSlopeValue > 0 || latestMargin > 0.10) ebitdaMarginSignal = 'green';
    else if (ebitdaSlopeValue >= -0.005) ebitdaMarginSignal = 'yellow';
    else ebitdaMarginSignal = 'red';
  }
  const ebitdaMarginMetric: MetricResult = {
    name: 'EBITDA Margin Trend',
    value: ebitdaSlopeValue,
    formattedValue: ebitdaSlopeValue != null ? `slope ${ebitdaSlopeValue.toFixed(3)}` : 'n/a',
    signal: ebitdaMarginSignal,
  };

  // Net Debt/EBITDA Trend (slope ascending = worsening if positive)
  const ndEbitdaSeries = sorted
    .slice()
    .reverse() // oldest first
    .map(y => {
      const ebitda = y.ebit != null && y.depreciation != null ? y.ebit + y.depreciation : null;
      const nd = y.financialDebt != null && y.cash != null ? y.financialDebt - y.cash : null;
      return ebitda != null && nd != null && ebitda > 0 ? nd / ebitda : null;
    })
    .filter((v): v is number => v !== null);

  let ndEbitdaTrendSignal: Signal = 'na';
  let ndEbitdaSlopeValue: number | null = null;
  if (ndEbitdaSeries.length >= 3) {
    ndEbitdaSlopeValue = linearSlope(ndEbitdaSeries);
    // declining (negative slope) = good
    if (ndEbitdaSlopeValue < -0.1) ndEbitdaTrendSignal = 'green';
    else if (ndEbitdaSlopeValue <= 0.1) ndEbitdaTrendSignal = 'yellow';
    else ndEbitdaTrendSignal = 'red';
  }
  const ndEbitdaTrendMetric: MetricResult = {
    name: 'Net Debt/EBITDA Trend',
    value: ndEbitdaSlopeValue,
    formattedValue: ndEbitdaSlopeValue != null ? `slope ${ndEbitdaSlopeValue.toFixed(3)}` : 'n/a',
    signal: ndEbitdaTrendSignal,
  };

  const metrics = [revCagrMetric, ebitdaMarginMetric, ndEbitdaTrendMetric];
  // Trend signal: green if all green, red if ≥2 red, yellow otherwise
  const redCount = metrics.filter(m => m.signal === 'red').length;
  const greenCount = metrics.filter(m => m.signal === 'green').length;
  const trendSignal: Signal = redCount >= 2 ? 'red' : greenCount === metrics.length ? 'green' : 'yellow';

  return { name: 'Financial Trend', signal: trendSignal, metrics };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_RANK: Record<Signal, number> = { red: 3, yellow: 2, green: 1, na: 0 };

function worstSignal(metrics: MetricResult[]): Signal {
  return metrics.reduce<Signal>((worst, m) =>
    SIGNAL_RANK[m.signal] > SIGNAL_RANK[worst] ? m.signal : worst,
    'na'
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function computeScorecard(years: FinancialYear[]): FundamentalScorecard {
  if (years.length === 0) {
    return { dimensions: [] };
  }

  // Use most recent year for snapshot dimensions
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const current = sorted[0];

  const dimensions: DimensionResult[] = [
    computeDebtBurden(current),
    computeDebtService(current),
    computeLiquidity(current),
    computeProfitability(current),
    computeAssetCoverage(current),
    computeTrend(sorted),
  ];

  return { dimensions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /workspaces/CatalystViewer && npx vitest run packages/web/src/bonds/fundamentals/scorecard.test.ts
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/bonds/fundamentals/
git commit -m "feat: add fundamental analysis scorecard engine with tests"
```

---

## Task 6: UI — IssuerScorecard component

**Files:**
- Create: `packages/web/src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx`

- [ ] **Step 1: Create the component**

Create `packages/web/src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx`:

```tsx
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { FundamentalScorecard, Signal, DimensionResult } from '@/bonds/fundamentals/scorecard';

const SIGNAL_COLOR: Record<Signal, string> = {
  green: '#4ade80',   // green-400
  yellow: '#facc15',  // yellow-400
  red: '#f87171',     // red-400
  na: '#cbd5e1',      // slate-300
};

const SIGNAL_LABEL: Record<Signal, string> = {
  green: '●',
  yellow: '●',
  red: '●',
  na: '○',
};

function SignalDot({ signal }: { signal: Signal }) {
  return (
    <Box
      component='span'
      sx={{ color: SIGNAL_COLOR[signal], fontSize: '1.1rem', lineHeight: 1 }}
      aria-label={signal}
    >
      {SIGNAL_LABEL[signal]}
    </Box>
  );
}

function DimensionRow({ dimension }: { dimension: DimensionResult }) {
  const tooltipContent = (
    <Stack spacing={0.5} sx={{ p: 0.5 }}>
      {dimension.metrics.map(m => (
        <Stack key={m.name} direction='row' spacing={1} alignItems='center'>
          <SignalDot signal={m.signal} />
          <Typography variant='caption'>{m.name}: {m.formattedValue}</Typography>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <Tooltip title={tooltipContent} placement='right' arrow>
      <Stack direction='row' spacing={1} alignItems='center' sx={{ cursor: 'default' }}>
        <SignalDot signal={dimension.signal} />
        <Typography variant='caption' sx={{ color: 'text.secondary' }}>
          {dimension.name}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

type IssuerScorecardProps = {
  scorecard: FundamentalScorecard;
};

export default function IssuerScorecard({ scorecard }: IssuerScorecardProps): React.JSX.Element {
  if (scorecard.dimensions.length === 0) {
    return <Typography variant='caption' sx={{ color: 'text.disabled' }}>No financial data</Typography>;
  }

  return (
    <Box>
      <Typography variant='caption' sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, display: 'block' }}>
        Fundamental Analysis
      </Typography>
      <Stack spacing={0.5}>
        {scorecard.dimensions.map(d => (
          <DimensionRow key={d.name} dimension={d} />
        ))}
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 2: Wire IssuerScorecard into IssuerCard**

In `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`, add the import at the top of the file (after existing imports):

```ts
import IssuerScorecard from './IssuerScorecard';
import { computeScorecard, type FundamentalScorecard } from '@/bonds/fundamentals/scorecard';
import type { FinancialYear } from '@/sdk/Issuers';
```

Add `financials` to the `IssuerCardParam` type:

```ts
type IssuerCardParam = {
  issuerReport: IssuerReport;
  statistics: InterestPercentilesByInterestBaseType;
  isChecked: boolean;
  onIssuerChecked: (issuerName: string, checked: boolean) => void;
  financials: FinancialYear[];
}
```

Add the scorecard computation inside the component function, before `return`:

```ts
const scorecard: FundamentalScorecard = computeScorecard(financials);
const hasScorecard = financials.length > 0;
```

Update the expand trigger condition from:

```ts
{(issuerReport.businessSummary || issuerReport.websiteUrl) && (
```

to:

```ts
{(issuerReport.businessSummary || issuerReport.websiteUrl || hasScorecard) && (
```

Add the scorecard inside the `<Collapse>` section, before the `classifiedAtTs` timestamp — after the websiteUrl `<CardSectionRow>` block and before the `classifiedAtTs` Typography. Look for the closing block of the websiteUrl section and insert:

```tsx
{hasScorecard && (
  <CardSectionRow>
    <IssuerScorecard scorecard={scorecard} />
  </CardSectionRow>
)}
```

- [ ] **Step 3: Wire financials through IssuersList**

In `packages/web/src/components/BondReportsBrowser/issuers/IssuersList.tsx`, add `FinancialYear` to the import:

```ts
import { BondReport } from '@/sdk/Bonds';
import { IssuerProfile, getIssuerFinancials } from '@/sdk/Issuers';
import type { FinancialYear } from '@/sdk/Issuers';
```

Add `financialsByIssuer` to the props type:

```ts
type IssuersListParam = {
  bondReports: BondReport[];
  issuerProfiles: IssuerProfile[];
  financialsByIssuer: Map<string, FinancialYear[]>;
  statistics: InterestPercentilesByInterestBaseType;
  filteringOptions: BondReportsFilteringOptions;
  setFilteringOptions: (param: BondReportsFilteringOptions) => void;
}
```

Update the destructuring:

```ts
export default function IssuersList({ bondReports, issuerProfiles, financialsByIssuer, statistics, filteringOptions, setFilteringOptions }: IssuersListParam): React.JSX.Element {
```

Pass `financials` to `IssuerCard` in the render section. Find where `IssuerCard` is rendered (it receives `issuerReport`) and add:

```tsx
<IssuerCard
  key={`${issuerReport.name}-${issuerReport.interestBaseType}`}
  issuerReport={issuerReport}
  statistics={statistics}
  isChecked={selectedIssuerNames.has(issuerReport.name)}
  onIssuerChecked={toggleIssuer}
  financials={financialsByIssuer.get(issuerReport.name) ?? []}
/>
```

- [ ] **Step 4: Fetch financials in BondReportsBrowser and pass down**

In `packages/web/src/components/BondReportsBrowser/index.tsx`, add the import:

```ts
import { BondReport, getBondReports } from "@/sdk/Bonds";
import { IssuerProfile, getIssuerProfiles, getIssuerFinancials } from "@/sdk/Issuers";
import type { FinancialYear } from "@/sdk/Issuers";
```

Add state for financials after `const [issuerProfiles, setIssuerProfiles] = useState<IssuerProfile[]>([])`:

```ts
const [issuerFinancials, setIssuerFinancials] = useState<FinancialYear[]>([]);
```

Inside the `useEffect` that fetches data (look for where `getBondReports` and `getIssuerProfiles` are called), add a parallel fetch:

```ts
const [bondReports, issuerProfiles, financials] = await Promise.all([
  getBondReports(bondType),
  getIssuerProfiles(),
  getIssuerFinancials(),
]);
setAllBondReports(bondReports);
setIssuerProfiles(issuerProfiles);
setIssuerFinancials(financials);
```

> **Note:** The existing `useEffect` may call them separately. Refactor to `Promise.all` only if they are in the same effect; if they are in separate effects, add a new `useState` + separate fetch for financials that mirrors the `getIssuerProfiles` pattern.

Compute the `financialsByIssuer` map in the render (near where `issuerProfiles` is used):

```ts
const financialsByIssuer = useMemo(
  () => issuerFinancials.reduce((map, f) => {
    const list = map.get(f.issuerName) ?? [];
    list.push(f);
    map.set(f.issuerName, list);
    return map;
  }, new Map<string, FinancialYear[]>()),
  [issuerFinancials]
);
```

Pass `financialsByIssuer` to `IssuersList`:

```tsx
<IssuersList
  bondReports={filteredBondReports}
  issuerProfiles={issuerProfiles}
  financialsByIssuer={financialsByIssuer}
  statistics={statistics}
  filteringOptions={filteringOptions}
  setFilteringOptions={setFilteringOptions}
/>
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/
git commit -m "feat: add fundamental scorecard UI to IssuerCard"
```

---

## Task 7: Data ingestion script

**Files:**
- Create: `scripts/store-issuer-financials/store-issuer-financials.ts`
- Create: `scripts/store-issuer-financials/package.json`
- Create: `scripts/store-issuer-financials/tsconfig.json`
- Create: `scripts/store-issuer-financials/sst-env.d.ts`
- Create: `scripts/store-issuer-financials/README.md`

- [ ] **Step 1: Create package.json**

Create `scripts/store-issuer-financials/package.json`:

```json
{
  "name": "store-issuer-financials",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "store": "tsx store-issuer-financials.ts",
    "store:dry": "tsx store-issuer-financials.ts --dry-run"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "3.896.0",
    "@aws-sdk/lib-dynamodb": "3.896.0",
    "dotenv": "16.5.0"
  },
  "devDependencies": {
    "tsx": "4.19.3",
    "typescript": "5.8.3"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `scripts/store-issuer-financials/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 3: Create sst-env.d.ts**

Create `scripts/store-issuer-financials/sst-env.d.ts`:

```ts
/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
/* biome-ignore-all lint: auto-generated */

/// <reference path="../../sst-env.d.ts" />

import "sst"
export {}
```

- [ ] **Step 4: Create the script**

Create `scripts/store-issuer-financials/store-issuer-financials.ts`:

```ts
/**
 * store-issuer-financials.ts
 *
 * Reads a JSON file of financial records and stores them into the
 * IssuerFinancials DynamoDB table.
 *
 * Usage:
 *   npm run store -- <table-name> <json-file>         # live run
 *   npm run store:dry -- <table-name> <json-file>     # dry run (no writes)
 *
 * The JSON file must be an array of objects matching DbIssuerFinancials:
 * [
 *   {
 *     "issuerName": "Acme S.A.",
 *     "year": 2024,
 *     "revenue": 48200,
 *     "ebit": 5100,
 *     "depreciation": 2700,
 *     "interestExpense": 1200,
 *     "netProfit": 2900,
 *     "totalAssets": 42000,
 *     "intangibleAssets": 800,
 *     "equity": 18500,
 *     "financialDebt": 14000,
 *     "cash": 3200,
 *     "currentAssets": 16000,
 *     "inventory": 4500,
 *     "currentLiabilities": 9800
 *   }
 * ]
 *
 * AWS credentials must be available in the environment (AWS_PROFILE or env vars).
 */

import { readFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const REQUIRED_FIELDS: string[] = ['issuerName', 'year'];
const NUMERIC_FIELDS: string[] = [
  'revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit',
  'totalAssets', 'intangibleAssets', 'equity', 'financialDebt', 'cash',
  'currentAssets', 'inventory', 'currentLiabilities',
];

// ─── CLI args ──────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => a !== '--dry-run');

const [tableName, jsonFilePath] = args;

if (!tableName || !jsonFilePath) {
  console.error('Usage: npx tsx store-issuer-financials.ts <table-name> <json-file> [--dry-run]');
  process.exit(1);
}

// ─── Load and validate input ──────────────────────────────────────────────────

type FinancialsRecord = {
  issuerName: string;
  year: number;
  [key: string]: unknown;
};

let records: FinancialsRecord[];
try {
  const raw = readFileSync(jsonFilePath, 'utf-8');
  records = JSON.parse(raw) as FinancialsRecord[];
  if (!Array.isArray(records)) throw new Error('JSON root must be an array');
} catch (err) {
  console.error(`Failed to read or parse ${jsonFilePath}:`, err);
  process.exit(1);
}

const errors: string[] = [];
records.forEach((r, i) => {
  REQUIRED_FIELDS.forEach(f => {
    if (r[f] == null) errors.push(`Record ${i}: missing required field '${f}'`);
  });
  if (typeof r.issuerName !== 'string') errors.push(`Record ${i}: 'issuerName' must be a string`);
  if (typeof r.year !== 'number' || !Number.isInteger(r.year)) errors.push(`Record ${i}: 'year' must be an integer`);
  NUMERIC_FIELDS.forEach(f => {
    if (r[f] !== undefined && typeof r[f] !== 'number') errors.push(`Record ${i}: '${f}' must be a number`);
  });
});

if (errors.length > 0) {
  console.error('Validation errors:');
  errors.forEach(e => console.error(' ', e));
  process.exit(1);
}

console.log(`Found ${records.length} record(s) in ${jsonFilePath}`);
if (isDryRun) console.log('[DRY RUN] No writes will be made.');

// ─── Write to DynamoDB ────────────────────────────────────────────────────────

const client = new DynamoDBClient({ region: 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

let stored = 0;
let skipped = 0;

for (const record of records) {
  console.log(`  ${isDryRun ? '[DRY]' : 'Storing'} ${record.issuerName} / ${record.year}`);
  if (!isDryRun) {
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: record,
    }));
    stored++;
  } else {
    skipped++;
  }
}

console.log(`\nDone. Stored: ${stored}, Skipped (dry run): ${skipped}`);
```

- [ ] **Step 5: Create README.md**

Create `scripts/store-issuer-financials/README.md`:

```markdown
# store-issuer-financials

Ingests issuer financial data (annual P&L and balance sheet figures) into the
`IssuerFinancials` DynamoDB table.

## Usage

```bash
npm install

# Dry run (no writes):
npm run store:dry -- <table-name> <path/to/financials.json>

# Live run:
npm run store -- <table-name> <path/to/financials.json>
```

Find the table name in the AWS console or in the SST deployment output.

## Input format

The JSON file must be an array of records. All monetary values in the same unit
(e.g. PLN thousands). All fields except `issuerName` and `year` are optional.

```json
[
  {
    "issuerName": "Acme S.A.",
    "year": 2024,
    "revenue": 48200,
    "ebit": 5100,
    "depreciation": 2700,
    "interestExpense": 1200,
    "netProfit": 2900,
    "totalAssets": 42000,
    "intangibleAssets": 800,
    "equity": 18500,
    "financialDebt": 14000,
    "cash": 3200,
    "currentAssets": 16000,
    "inventory": 4500,
    "currentLiabilities": 9800
  }
]
```
```

- [ ] **Step 6: Commit**

```bash
git add scripts/store-issuer-financials/
git commit -m "feat: add store-issuer-financials ingestion script"
```

---

## Task 8: Type-check everything

- [ ] **Step 1: Type-check core**

```bash
cd /workspaces/CatalystViewer && npx tsc -p packages/core/tsconfig.json --noEmit
```

Expected: no errors

- [ ] **Step 2: Type-check functions**

```bash
npx tsc -p packages/functions/tsconfig.json --noEmit
```

Expected: no errors

- [ ] **Step 3: Type-check web**

```bash
npx tsc -p packages/web/tsconfig.json --noEmit
```

Expected: no errors

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass including the new scorecard tests

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verify type-check and tests pass for fundamental analysis"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] 6-dimension risk scorecard — Tasks 5 (engine) + 6 (UI)
- [x] Traffic-light signals (Green/Yellow/Red) — `scorecard.ts` `Signal` type
- [x] Debt Burden: D/E, Net Debt/EBITDA thresholds — Task 5
- [x] Debt Service: ICR thresholds — Task 5
- [x] Liquidity: Current Ratio, Quick Ratio thresholds — Task 5
- [x] Profitability: EBIT Margin, Net Margin thresholds — Task 5
- [x] Asset Coverage: Asset Coverage Ratio, Equity Ratio thresholds — Task 5
- [x] Trend Dimension: Revenue CAGR, EBITDA Margin Trend, Net Debt/EBITDA Trend — Task 5
- [x] Trend requires ≥3 years; returns `na` otherwise — tested in Task 5
- [x] No aggregate score — scorecard returns per-dimension results — Task 6 (UI shows rows, no sum)
- [x] Data storage (DynamoDB) — Tasks 1 + 2
- [x] API endpoint — Tasks 2 + 3
- [x] Web SDK — Task 4
- [x] Data ingestion — Task 7
- [x] Scope: corporate issuers only (non-corporate issuers will have no financial data entered; the UI gracefully shows nothing) — `IssuerScorecard` handles empty `financials`

**Out of scope (deferred per design doc):**
- Industry-specific threshold modules
- Threshold calibration against historical Catalyst defaults
- Municipal/bank/financial issuer modules
