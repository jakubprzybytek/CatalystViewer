import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop, type AgentEvent } from '@core/ai/agent/index';
import { WebSearchTool } from '@core/ai/tools/WebSearchTool';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { MODEL_ID } from '@core/ai/issuers/IssuerClassification';

// ─── Types ────────────────────────────────────────────────────────────────────

type YearlyIndicators = {
    year: number;
    revenue: number | null;      // PLN millions
    ebitda: number | null;       // PLN millions
    netDebt: number | null;      // PLN millions (total debt - cash)
    netIncome: number | null;    // PLN millions
};

type FundamentalAnalysis = {
    companyName: string;
    currency: string;
    unit: string;
    years: YearlyIndicators[];
    notes: string;
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

const issuerName = process.argv[2];

if (!issuerName) {
    console.error('Usage: npx tsx analyze-issuer.ts "<Issuer Name>"');
    process.exit(1);
}

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
    console.error('Error: TAVILY_API_KEY environment variable is not set.');
    console.error('Create a .env.local file with: TAVILY_API_KEY=tvly-your-key-here');
    process.exit(1);
}

// ─── Agent setup ──────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({});
const tavilyClient = new TavilyClient(tavilyApiKey!);
const webSearchTool = new WebSearchTool(tavilyClient);
const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [webSearchTool], 5);

const taskPrompt = `You are a financial analyst researching Polish companies that issue bonds on the Catalyst bond market.

Your task is to find and extract key financial indicators for the company below.

Company name: "${issuerName}"

The name provided is the legal registered name (e.g. "P4 Sp. z o.o." is the legal entity behind the Play mobile network).

Instructions:
1. First, identify the real-world company or brand behind this legal name.
2. Search for its annual reports, financial results, or investor relations pages.
3. Find key financial indicators for the most recent 3 years available.
4. Focus on: Revenue, EBITDA, Net Debt (total debt minus cash), Net Income.
5. All monetary values should be in PLN millions (if originally in thousands, divide by 1000; if in billions, multiply by 1000). If the company reports in a different currency, note that in the currency field.
6. Limit yourself to at most 8 web searches. Stop searching as soon as you have enough data to fill in most indicators — do not keep searching for perfect completeness. Produce the JSON with whatever you found, using null for missing values.

Respond with a JSON object ONLY — no markdown, no explanation:
{
  "companyName": "<common name or brand of the company>",
  "currency": "PLN",
  "unit": "millions",
  "years": [
    {
      "year": <YYYY>,
      "revenue": <number or null if not found>,
      "ebitda": <number or null if not found>,
      "netDebt": <number or null if not found>,
      "netIncome": <number or null if not found>
    }
  ],
  "notes": "<brief note on data sources or any caveats, e.g. estimated figures, fiscal year differences>"
}

Include up to 3 years, ordered from most recent to oldest. Only include years where you found at least one indicator.`;

// ─── Live event handler ───────────────────────────────────────────────────────

function onEvent(event: AgentEvent): void {
    const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '...' : s;

    switch (event.type) {
        case 'tool_use': {
            const input = event.input as Record<string, unknown>;
            const query = typeof input['query'] === 'string' ? input['query'] : JSON.stringify(input);
            console.log(`\n[iter ${event.iteration}] Searching: "${query}"`);
            break;
        }
        case 'tool_result': {
            let results: Array<{ url: string; title: string; content: string }> = [];
            try { results = JSON.parse(event.result); } catch { /* not JSON */ }
            if (results.length > 0) {
                console.log(`           Got ${results.length} result(s):`);
                for (const r of results) {
                    console.log(`             · ${r.url}`);
                    console.log(`               ${truncate(r.title, 80)}`);
                    console.log(`               ${truncate(r.content, 120)}`);
                }
            }
            break;
        }
        case 'end_turn':
            console.log(`\n[iter ${event.iteration}] Agent finished.`);
            break;
    }
}

// ─── Result parsing ───────────────────────────────────────────────────────────

function parseResult(text: string): FundamentalAnalysis {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Response does not contain a JSON object');
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
        typeof parsed['companyName'] !== 'string' ||
        !Array.isArray(parsed['years'])
    ) {
        throw new Error('Response missing required fields');
    }
    return parsed as unknown as FundamentalAnalysis;
}

// ─── Output formatting ────────────────────────────────────────────────────────

function fmt(value: number | null): string {
    if (value === null) return '       —';
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(8);
}

function printTable(result: FundamentalAnalysis): void {
    const unit = `${result.currency} ${result.unit}`;
    console.log(`\nCompany:  ${result.companyName}`);
    console.log(`Issuer:   ${issuerName}`);
    console.log(`Unit:     ${unit}\n`);

    const header = 'Year     Revenue    EBITDA   Net Debt  Net Income';
    const sep    = '────  ─────────  ────────  ─────────  ──────────';
    console.log(header);
    console.log(sep);

    for (const y of result.years) {
        const row = [
            String(y.year).padEnd(4),
            fmt(y.revenue),
            fmt(y.ebitda),
            fmt(y.netDebt),
            fmt(y.netIncome),
        ].join('  ');
        console.log(row);
    }

    if (result.notes) {
        console.log(`\nNotes: ${result.notes}`);
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`Issuer:  ${issuerName}`);
console.log(`Model:   ${MODEL_ID}`);
console.log('─'.repeat(80));

try {
    const rawAnswer = await agentLoop.run(taskPrompt, onEvent);
    const result = parseResult(rawAnswer);

    console.log('\n' + '═'.repeat(60));
    printTable(result);
    console.log('═'.repeat(60));
} catch (error) {
    console.error('Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
