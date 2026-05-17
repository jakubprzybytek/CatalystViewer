# Fundamental Analysis Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `FundamentalAnalysisStateMachine` Step Functions state machine that selects corporate bond issuers by analysis staleness, runs an AI agent to gather financial data for each, computes the 6-dimension risk scorecard, stores a full markdown report in DynamoDB, and sends an email summary.

**Spec:** `docs/superpowers/specs/2026-05-17-fundamental-analysis-workflow-design.md`

**Tech Stack:** TypeScript, AWS Step Functions, AWS Lambda, DynamoDB, Bedrock, SES, SST v3

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `packages/core/src/storage/issuerProfiles/index.ts` | Modify | Add `reportMarkdown?` to `DbIssuerAnalysisRecord` |
| `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts` | Modify | Add `getAllLatestAnalyses()` method |
| `packages/core/src/ai/issuers/IssuerAnalysis.ts` | Create | `analyzeIssuer()`, `buildReportMarkdown()`, `AgentFinancials` type |
| `packages/functions/src/issuers/index.ts` | Modify | Add `SelectIssuersInput`, `SelectIssuersResult`, `AnalyzeIssuerInput`, `AnalyzeIssuerResult` |
| `packages/functions/src/issuers/selectIssuers.ts` | Create | SelectIssuers Lambda handler |
| `packages/functions/src/issuers/analyzeIssuer.ts` | Create | AnalyzeIssuer Lambda handler |
| `packages/functions/src/emails/sendAnalysisReport.ts` | Create | SendAnalysisReport email Lambda handler |
| `infra/updater.ts` | Modify | Add 3 Lambda definitions, IAM role/policy, `FundamentalAnalysisStateMachine` |
| `README.md` | Modify | Document state machine name and input parameters |

---

## Task 1 — Storage: add `reportMarkdown` to `DbIssuerAnalysisRecord`

**File:** `packages/core/src/storage/issuerProfiles/index.ts`

- [ ] **Step 1: Add `reportMarkdown?` field**

Add `reportMarkdown?: string` to `DbIssuerAnalysisRecord` as the last field:

```ts
export type DbIssuerAnalysisRecord = {
    issuerName: string;
    recordType: string;        // SK: "#ANALYSIS#<iso>" | "#LATEST_ANALYSIS"
    performedAt: string;       // ISO 8601 (debugging)
    performedAtTs: number;     // Unix ms (business logic)
    modelId: string;
    scorecard?: FundamentalScorecard;
    agentFinancials?: unknown;
    agentLog?: unknown[];
    reportMarkdown?: string;   // Full markdown report of the analysis run
};
```

---

## Task 2 — Storage: add `getAllLatestAnalyses()` to `IssuerProfilesTable`

**File:** `packages/core/src/storage/issuerProfiles/IssuerProfilesTable.ts`

- [ ] **Step 1: Add `getAllLatestAnalyses()` method**

Add after the existing `getLatestAnalysis()` method:

```ts
async getAllLatestAnalyses(): Promise<Map<string, number>> {
    console.log('IssuerProfilesTable: Fetching all latest analyses');

    const startTimestamp = new Date().getTime();

    const scanCommand = new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'recordType = :rt',
        ExpressionAttributeValues: { ':rt': '#LATEST_ANALYSIS' },
        ProjectionExpression: 'issuerName, performedAtTs',
    });

    const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
    const endTimestamp = new Date().getTime();
    console.log(`IssuerProfilesTable: Returning ${result.Count ?? 0} latest analyses in ${endTimestamp - startTimestamp} ms.`);

    const map = new Map<string, number>();
    if (result.Items) {
        for (const item of result.Items) {
            map.set(item['issuerName'] as string, item['performedAtTs'] as number);
        }
    }
    return map;
}
```

---

## Task 3 — Core: create `IssuerAnalysis.ts`

**File:** `packages/core/src/ai/issuers/IssuerAnalysis.ts`

This module extracts the analysis logic from `scripts/analyze-issuer/analyze-issuer.ts` into a reusable function.

- [ ] **Step 1: Create the module**

```ts
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AgentLoop, type AgentEvent } from '../agent/index';
import { WebSearchTool } from '../tools/WebSearchTool';
import { StockwatchTool } from '../tools/StockwatchTool';
import { BiznesradarTool } from '../tools/BiznesradarTool';
import { TavilyClient } from '../tools/tavily/TavilyClient';
import { MODEL_ID } from './IssuerClassification';
import { computeScorecard, type FundamentalScorecard, type Signal } from '../../bonds/fundamentals/scorecard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type YearlyFinancials = {
    year: number;
    revenue?: number | null;
    ebit?: number | null;
    depreciation?: number | null;
    interestExpense?: number | null;
    netProfit?: number | null;
    totalAssets?: number | null;
    intangibleAssets?: number | null;
    equity?: number | null;
    financialDebt?: number | null;
    cash?: number | null;
    currentAssets?: number | null;
    inventory?: number | null;
    currentLiabilities?: number | null;
};

export type AgentFinancials = {
    companyName: string;
    currency: string;
    unit: string;
    years: YearlyFinancials[];
    notes: string;
};

export type IssuerAnalysisDeps = {
    bedrockClient: BedrockRuntimeClient;
    tavilyClient: TavilyClient;
};

export type IssuerAnalysisResult = {
    issuerName: string;
    scorecard: FundamentalScorecard;
    agentFinancials: AgentFinancials;
    agentLog: AgentEvent[];
    reportMarkdown: string;
    modelId: string;
};

// ─── Task prompt ──────────────────────────────────────────────────────────────

function buildTaskPrompt(issuerName: string): string {
    return `Jesteś analitykiem finansowym badającym polskie spółki emitujące obligacje na rynku Catalyst.

Twoim zadaniem jest zebranie pełnych danych finansowych (rachunek zysków i strat oraz bilans) dla podanej spółki.

Nazwa spółki: "${issuerName}"

Podana nazwa to zarejestrowana nazwa prawna (np. "P4 Sp. z o.o." to podmiot prawny stojący za siecią komórkową Play).

Instrukcje:
1. Zidentyfikuj spółkę lub markę kryjącą się za tą nazwą prawną.
2. Użyj narzędzia stockwatch_financials z popularną nazwą lub tickerem GPW — to jest Twoje główne źródło danych (zwraca roczny rachunek zysków i strat oraz bilans za wiele lat w jednym wywołaniu).
3. Jeśli stockwatch nie znajdzie spółki, spróbuj biznesradar_financials.
4. Tylko jeśli oba powyższe zawiodą, uzupełnij brakujące dane przez web_search (Bankier.pl, raporty roczne spółki).
4. Zbierz następujące dane dla maksymalnie 5 ostatnich lat:
   - Rachunek zysków i strat: Przychody (revenue), EBIT, Amortyzacja (depreciation), Koszty odsetkowe (interestExpense), Zysk netto (netProfit)
   - Bilans: Aktywa ogółem (totalAssets), Wartości niematerialne (intangibleAssets), Kapitał własny (equity), Dług finansowy (financialDebt), Gotówka (cash), Aktywa obrotowe (currentAssets), Zapasy (inventory), Zobowiązania krótkoterminowe (currentLiabilities)
5. Uwaga: oba narzędzia finansowe zwracają wartości w tysiącach PLN — podziel przez 1000 aby uzyskać miliony. Jeśli spółka raportuje w innej walucie, zaznacz to w polu currency.
6. Ogranicz się do maksymalnie 5 wywołań narzędzi. Wstaw null dla brakujących wartości.

Odpowiedz WYŁĄCZNIE obiektem JSON — bez markdown, bez wyjaśnień:
{
  "companyName": "<popularna nazwa lub marka spółki>",
  "currency": "PLN",
  "unit": "millions",
  "years": [
    {
      "year": <YYYY>,
      "revenue": <number|null>,
      "ebit": <number|null>,
      "depreciation": <number|null>,
      "interestExpense": <number|null>,
      "netProfit": <number|null>,
      "totalAssets": <number|null>,
      "intangibleAssets": <number|null>,
      "equity": <number|null>,
      "financialDebt": <number|null>,
      "cash": <number|null>,
      "currentAssets": <number|null>,
      "inventory": <number|null>,
      "currentLiabilities": <number|null>
    }
  ],
  "notes": "<źródła, zastrzeżenia>"
}

Uwzględnij lata posortowane od najnowszego do najstarszego. Uwzględniaj tylko lata, dla których znalazłeś co najmniej jeden wskaźnik.`;
}

// ─── Result parsing ───────────────────────────────────────────────────────────

function parseAgentFinancials(text: string): AgentFinancials {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Agent response does not contain a JSON object');
    }
    let json = text.slice(start, end + 1);
    while (/\d [ \u00a0]\d/.test(json)) {
        json = json.replace(/(\d)[ \u00a0](\d)/g, '$1$2');
    }
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed['companyName'] !== 'string' || !Array.isArray(parsed['years'])) {
        throw new Error('Agent response missing required fields');
    }
    return parsed as unknown as AgentFinancials;
}

// ─── Markdown report builder ──────────────────────────────────────────────────

function signalEmoji(signal: Signal): string {
    switch (signal) {
        case 'green':  return '🟢';
        case 'yellow': return '🟡';
        case 'red':    return '🔴';
        case 'na':     return '⚪';
    }
}

function fmt(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function buildReportMarkdown(
    issuerName: string,
    agentFinancials: AgentFinancials,
    scorecard: FundamentalScorecard,
    agentEvents: AgentEvent[],
): string {
    const now = new Date().toISOString();
    const lines: string[] = [];

    lines.push(`# Fundamental Analysis: ${issuerName}`);
    lines.push('');
    lines.push(`**Date:** ${now}`);
    lines.push(`**Model:** ${MODEL_ID}`);
    lines.push(`**Company:** ${agentFinancials.companyName} (${agentFinancials.currency} ${agentFinancials.unit})`);
    lines.push('');

    // Financial data table
    lines.push('## Financial Data');
    lines.push('');
    lines.push('| Year | Revenue | EBIT | Net Profit | Equity | Fin. Debt |');
    lines.push('|------|--------:|-----:|-----------:|-------:|----------:|');
    for (const y of agentFinancials.years) {
        lines.push(`| ${y.year} | ${fmt(y.revenue)} | ${fmt(y.ebit)} | ${fmt(y.netProfit)} | ${fmt(y.equity)} | ${fmt(y.financialDebt)} |`);
    }
    if (agentFinancials.notes) {
        lines.push('');
        lines.push(`**Notes:** ${agentFinancials.notes}`);
    }
    lines.push('');

    // Scorecard
    lines.push('## Scorecard');
    lines.push('');
    lines.push(`| ${signalEmoji(scorecard.dimensions[0]?.signal ?? 'na')} Dimension | Signal | Metrics |`);
    lines.push('|---|---|---|');
    for (const dim of scorecard.dimensions) {
        const metricsStr = dim.metrics
            .map(m => `${m.name}: ${m.formattedValue} ${signalEmoji(m.signal)}`)
            .join(' · ');
        lines.push(`| ${dim.name} | ${signalEmoji(dim.signal)} | ${metricsStr} |`);
    }
    lines.push('');

    // Agent steps
    lines.push('## Agent Steps');
    lines.push('');
    let usageEvent: AgentEvent | undefined;
    for (const event of agentEvents) {
        if (event.type === 'tool_use') {
            const input = event.input as Record<string, unknown>;
            lines.push(`### Iteration ${event.iteration} — ${event.toolName}`);
            lines.push('');
            lines.push('**Input:**');
            lines.push('```json');
            lines.push(JSON.stringify(input, null, 2));
            lines.push('```');
            lines.push('');
        } else if (event.type === 'tool_result') {
            lines.push('**Result:**');
            lines.push('```');
            lines.push(event.result);
            lines.push('```');
            lines.push('');
        } else if (event.type === 'usage') {
            usageEvent = event;
        }
    }

    // Token usage
    if (usageEvent && usageEvent.type === 'usage') {
        lines.push('## Token Usage');
        lines.push('');
        lines.push(`- Input: ${usageEvent.inputTokens.toLocaleString()}`);
        lines.push(`- Output: ${usageEvent.outputTokens.toLocaleString()}`);
        lines.push(`- Total: ${usageEvent.totalTokens.toLocaleString()}`);
        lines.push('');
    }

    return lines.join('\n');
}

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyzeIssuer(
    deps: IssuerAnalysisDeps,
    issuerName: string,
): Promise<IssuerAnalysisResult> {
    const { bedrockClient, tavilyClient } = deps;

    const webSearchTool = new WebSearchTool(tavilyClient);
    const stockwatchTool = new StockwatchTool();
    const biznesradarTool = new BiznesradarTool();
    const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [biznesradarTool, stockwatchTool, webSearchTool], 10);

    const agentEvents: AgentEvent[] = [];
    const rawAnswer = await agentLoop.run(buildTaskPrompt(issuerName), (event) => {
        agentEvents.push(event);
    });

    const agentFinancials = parseAgentFinancials(rawAnswer);

    const financialYears = agentFinancials.years.map(y => ({
        issuerName,
        year: y.year,
        revenue: y.revenue ?? undefined,
        ebit: y.ebit ?? undefined,
        depreciation: y.depreciation ?? undefined,
        interestExpense: y.interestExpense ?? undefined,
        netProfit: y.netProfit ?? undefined,
        totalAssets: y.totalAssets ?? undefined,
        intangibleAssets: y.intangibleAssets ?? undefined,
        equity: y.equity ?? undefined,
        financialDebt: y.financialDebt ?? undefined,
        cash: y.cash ?? undefined,
        currentAssets: y.currentAssets ?? undefined,
        inventory: y.inventory ?? undefined,
        currentLiabilities: y.currentLiabilities ?? undefined,
    }));

    const scorecard = computeScorecard(financialYears);
    const reportMarkdown = buildReportMarkdown(issuerName, agentFinancials, scorecard, agentEvents);

    return {
        issuerName,
        scorecard,
        agentFinancials,
        agentLog: agentEvents,
        reportMarkdown,
        modelId: MODEL_ID,
    };
}
```

---

## Task 4 — Functions: add new types to `index.ts`

**File:** `packages/functions/src/issuers/index.ts`

- [ ] **Step 1: Add input/output types for the new Lambdas**

Append to the existing file:

```ts
// ─── Fundamental Analysis Workflow ───────────────────────────────────────────

export type SelectIssuersInput = {
    issuers?: string[];
    count?: number;
};

export type SelectIssuersResult = {
    selectedIssuers: string[];
};

export type AnalyzeIssuerInput = {
    issuerName: string;
};

export type AnalyzeIssuerResult =
    | { issuerName: string; performedAt: string; success: true }
    | { issuerName: string; success: false; error: string };
```

---

## Task 5 — Functions: create `selectIssuers.ts`

**File:** `packages/functions/src/issuers/selectIssuers.ts`

- [ ] **Step 1: Create the handler**

```ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { SelectIssuersInput, SelectIssuersResult } from '.';

const logger = new Logger({ serviceName: 'SelectIssuers' });
const dynamoDBClient = new DynamoDBClient({});

export async function handler(input: SelectIssuersInput, context: Context): Promise<SelectIssuersResult> {
    logger.addContext(context);

    // Short-circuit: if specific issuers were provided, use them directly
    if (input.issuers && input.issuers.length > 0) {
        logger.info('Using provided issuer list', { count: input.issuers.length });
        return { selectedIssuers: input.issuers };
    }

    const count = input.count ?? 2;
    logger.info('Selecting issuers by staleness', { count });

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, Resource.BondDetails.name);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const [activeBonds, latestAnalyses] = await Promise.all([
        bondDetailsTable.getActive('Corporate bonds'),
        issuerProfilesTable.getAllLatestAnalyses(),
    ]);

    const uniqueIssuers = [...new Set(activeBonds.map(b => b.issuer))];
    logger.info('Corporate bond issuers found', { total: uniqueIssuers.length });

    const sorted = uniqueIssuers
        .map(issuerName => ({ issuerName, performedAtTs: latestAnalyses.get(issuerName) ?? 0 }))
        .sort((a, b) => a.performedAtTs - b.performedAtTs);

    const selectedIssuers = sorted.slice(0, count).map(i => i.issuerName);
    logger.info('Selected issuers', { selectedIssuers });

    return { selectedIssuers };
}
```

---

## Task 6 — Functions: create `analyzeIssuer.ts`

**File:** `packages/functions/src/issuers/analyzeIssuer.ts`

- [ ] **Step 1: Create the handler**

```ts
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { analyzeIssuer } from '@core/ai/issuers/IssuerAnalysis';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { AnalyzeIssuerInput, AnalyzeIssuerResult } from '.';

const logger = new Logger({ serviceName: 'AnalyzeIssuer' });

const bedrockClient = new BedrockRuntimeClient({});
const dynamoDBClient = new DynamoDBClient({});

export async function handler(input: AnalyzeIssuerInput, context: Context): Promise<AnalyzeIssuerResult> {
    logger.addContext(context);
    logger.info('Starting analysis', { issuerName: input.issuerName });

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        throw new Error('TAVILY_API_KEY environment variable is not set');
    }

    const tavilyClient = new TavilyClient(tavilyApiKey);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const result = await analyzeIssuer({ bedrockClient, tavilyClient }, input.issuerName);

    const now = new Date();
    await issuerProfilesTable.storeAnalysis({
        issuerName: result.issuerName,
        recordType: `#ANALYSIS#${now.toISOString()}`,
        performedAt: now.toISOString(),
        performedAtTs: now.getTime(),
        modelId: result.modelId,
        scorecard: result.scorecard,
        agentFinancials: result.agentFinancials,
        agentLog: result.agentLog,
        reportMarkdown: result.reportMarkdown,
    });

    logger.info('Analysis complete and stored', { issuerName: result.issuerName });

    return {
        issuerName: result.issuerName,
        performedAt: now.toISOString(),
        success: true,
    };
}
```

---

## Task 7 — Functions: create `sendAnalysisReport.ts`

**File:** `packages/functions/src/emails/sendAnalysisReport.ts`

- [ ] **Step 1: Create the handler**

The handler receives an array of `AnalyzeIssuerResult` items (the Map state output) and sends a plain-text email summary.

```ts
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { sendEmail } from './EmailClient';
import { AnalyzeIssuerResult } from '../issuers';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';
const SENDER_EMAIL = 'noreply@catalystviewer.pl';

const logger = new Logger({ serviceName: 'SendAnalysisReport' });
const ssmClient = new SSMClient({});

type SendAnalysisReportInput = AnalyzeIssuerResult[];

async function getRecipients(): Promise<string[]> {
    const result = await ssmClient.send(new GetParameterCommand({ Name: RECIPIENTS_PARAM_NAME }));
    const value = result.Parameter?.Value;
    if (!value) throw new Error(`Cannot fetch recipients (ssm:${RECIPIENTS_PARAM_NAME})`);
    return value.split(',');
}

export async function handler(input: SendAnalysisReportInput, context: Context): Promise<void> {
    logger.addContext(context);

    const succeeded = input.filter(r => r.success === true) as Extract<AnalyzeIssuerResult, { success: true }>[];
    const failed = input.filter(r => r.success === false) as Extract<AnalyzeIssuerResult, { success: false }>[];

    logger.info('Sending analysis report', { succeeded: succeeded.length, failed: failed.length });

    const lines: string[] = [
        `Fundamental Analysis Report`,
        `Date: ${new Date().toISOString()}`,
        '',
        `Analysed: ${succeeded.length} issuer(s)`,
    ];

    for (const r of succeeded) {
        lines.push(`  ✓ ${r.issuerName} — completed at ${r.performedAt}`);
    }

    if (failed.length > 0) {
        lines.push('');
        lines.push(`Failed: ${failed.length} issuer(s)`);
        for (const r of failed) {
            lines.push(`  ✗ ${r.issuerName} — ${r.error}`);
        }
    }

    const body = lines.join('\n');
    const subject = `[CatalystViewer] Fundamental Analysis — ${succeeded.length} completed, ${failed.length} failed`;

    const recipients = await getRecipients();
    await sendEmail({ to: recipients, subject, body, from: SENDER_EMAIL });

    logger.info('Analysis report sent');
}
```

---

## Task 8 — Infra: add `FundamentalAnalysisStateMachine` to `infra/updater.ts`

**File:** `infra/updater.ts`

- [ ] **Step 1: Import new table**

Add `bondDetailsTable` to the existing import at the top of the file:

```ts
import { bondDetailsTable, bondStatisticsTable, issuerProfilesTable } from "./storage";
```

- [ ] **Step 2: Add the three new Lambda function definitions**

Add after the existing `classifyIssuersFunction` definition:

```ts
const selectIssuersFunction = new sst.aws.Function("SelectIssuers", {
  handler: "packages/functions/src/issuers/selectIssuers.handler",
  timeout: "60 seconds",
  link: [bondDetailsTable, issuerProfilesTable],
});

const analyzeIssuerFunction = new sst.aws.Function("AnalyzeIssuer", {
  handler: "packages/functions/src/issuers/analyzeIssuer.handler",
  timeout: "10 minutes",
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

const sendAnalysisReportFunction = new sst.aws.Function("SendAnalysisReport", {
  handler: "packages/functions/src/emails/sendAnalysisReport.handler",
  timeout: "30 seconds",
  permissions: [
    {
      actions: ["ses:SendEmail"],
      resources: ["arn:aws:ses:eu-west-1:198805281865:identity/*"],
    },
    {
      actions: ["ssm:GetParameter"],
      resources: [
        "arn:aws:ssm:eu-west-1:198805281865:parameter/catalyst-viewer/notifications/recipients",
      ],
    },
  ],
});
```

- [ ] **Step 3: Add the IAM role, policy, and state machine**

Add after the existing `BondsUpdaterStateMachine` definition (and its scheduler):

```ts
// ─── Fundamental Analysis State Machine ──────────────────────────────────────

const fundamentalAnalysisSfnRole = new aws.iam.Role("FundamentalAnalysisSfnRole", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "states.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

new aws.iam.RolePolicy("FundamentalAnalysisSfnPolicy", {
  role: fundamentalAnalysisSfnRole.id,
  policy: $resolve([
    selectIssuersFunction.arn,
    analyzeIssuerFunction.arn,
    sendAnalysisReportFunction.arn,
    sendErrorReportFunction.arn,
  ]).apply(([selectArn, analyzeArn, sendReportArn, sendErrorArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: [selectArn, analyzeArn, sendReportArn, sendErrorArn],
        },
      ],
    })
  ),
});

new aws.sfn.StateMachine("FundamentalAnalysisStateMachine", {
  name: `FundamentalAnalysisStateMachine-${$app.stage}`,
  roleArn: fundamentalAnalysisSfnRole.arn,
  definition: $resolve([
    selectIssuersFunction.arn,
    analyzeIssuerFunction.arn,
    sendAnalysisReportFunction.arn,
    sendErrorReportFunction.arn,
  ]).apply(([selectArn, analyzeArn, sendReportArn, sendErrorArn]) =>
    JSON.stringify({
      StartAt: "SelectIssuers",
      States: {
        "SelectIssuers": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: selectArn,
            "Payload.$": "$",
          },
          ResultSelector: {
            "selectedIssuers.$": "$.Payload.selectedIssuers",
          },
          ResultPath: "$",
          TimeoutSeconds: 60,
          Next: "AnalyzeIssuers",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SendErrorReport" }],
        },
        "AnalyzeIssuers": {
          Type: "Map",
          ItemsPath: "$.selectedIssuers",
          Parameters: {
            "issuerName.$": "$$.Map.Item.Value",
          },
          MaxConcurrency: 1,
          Iterator: {
            StartAt: "AnalyzeIssuer",
            States: {
              "AnalyzeIssuer": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: analyzeArn,
                  "Payload.$": "$",
                },
                ResultSelector: {
                  "issuerName.$": "$.Payload.issuerName",
                  "performedAt.$": "$.Payload.performedAt",
                  "success.$": "$.Payload.success",
                },
                TimeoutSeconds: 600,
                End: true,
                Catch: [
                  {
                    ErrorEquals: ["States.ALL"],
                    ResultPath: "$.errorInfo",
                    Next: "HandleAnalysisFailure",
                  },
                ],
              },
              "HandleAnalysisFailure": {
                Type: "Pass",
                Parameters: {
                  "issuerName.$": "$.issuerName",
                  "success": false,
                  "error.$": "$.errorInfo.Cause",
                },
                End: true,
              },
            },
          },
          Next: "SendAnalysisReport",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SendErrorReport" }],
        },
        "SendAnalysisReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendReportArn,
            "Payload.$": "$",
          },
          TimeoutSeconds: 30,
          Next: "Done",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SendErrorReport" }],
        },
        "Done": {
          Type: "Succeed",
        },
        "SendErrorReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendErrorArn,
            "Payload.$": "$",
          },
          TimeoutSeconds: 30,
          Next: "Fail",
        },
        "Fail": {
          Type: "Fail",
        },
      },
    })
  ),
});
```

---

## Task 9 — README: document the new state machine

**File:** `README.md`

- [ ] **Step 1: Add a section for the new state machine**

Find the section that documents the existing `BondsUpdaterStateMachine` (or add a new "State Machines" section if none exists) and add:

```markdown
### FundamentalAnalysisStateMachine

Runs on demand (invoke manually via AWS Console or CLI). Selects corporate bond issuers
by analysis staleness, runs an AI agent to gather 5 years of financial data, computes
a 6-dimension risk scorecard, and stores a full markdown report in DynamoDB.
Sends an email summary on completion.

**Input parameters:**

| Parameter | Type       | Default | Description                                             |
|-----------|------------|---------|---------------------------------------------------------|
| `issuers` | `string[]` | —       | Specific issuer names to analyse. Overrides `count`.    |
| `count`   | `number`   | `2`     | Number of issuers to pick (oldest analysis goes first). |

**Examples:**

```json
// Analyse 2 stalest issuers (default)
{}

// Analyse 5 stalest issuers
{ "count": 5 }

// Analyse specific issuers
{ "issuers": ["KRUK S.A.", "Ghelamco Invest Sp. z o.o."] }
```
```
