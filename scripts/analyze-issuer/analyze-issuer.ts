import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { MODEL_ID } from '@core/ai/issuers/IssuerClassification';
import { type AgentEvent } from '@core/ai/agent/index';
import { type Signal, type FundamentalScorecard } from '@core/bonds/fundamentals/scorecard';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { analyzeIssuer, type AgentFinancials } from '@core/ai/issuers/IssuerAnalysis';

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

const ISSUER_PROFILES_TABLE_NAME = process.env.ISSUER_PROFILES_TABLE_NAME ?? '';

// ─── Clients setup ────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({});
const tavilyClient = new TavilyClient(tavilyApiKey!);

// ─── Live event handler ───────────────────────────────────────────────────────

const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true';

function onEvent(event: AgentEvent): void {
    const truncate = (s: string, n: number) => DEBUG || s.length <= n ? s : s.slice(0, n) + '...';

    switch (event.type) {
        case 'tool_use': {
            const input = event.input as Record<string, unknown>;
            if (event.toolName === 'biznesradar_financials' || event.toolName === 'stockwatch_financials') {
                const site = event.toolName === 'biznesradar_financials' ? 'biznesradar.pl' : 'stockwatch.pl';
                const name = typeof input['companyName'] === 'string' ? input['companyName'] : JSON.stringify(input);
                console.log(`\n[iter ${event.iteration}] ${site} lookup: "${name}"`);
            } else {
                const query = typeof input['query'] === 'string' ? input['query'] : JSON.stringify(input);
                console.log(`\n[iter ${event.iteration}] Searching: "${query}"`);
            }
            break;
        }
        case 'tool_result': {
            if (event.toolName === 'biznesradar_financials' || event.toolName === 'stockwatch_financials') {
                if (DEBUG) {
                    console.log(`\n[DEBUG] Full result (${event.toolName}):\n${event.result}`);
                } else {
                    console.log(`           ${truncate(event.result, 200)}`);
                }
            } else {
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
            }
            break;
        }
        case 'end_turn':
            console.log(`\n[iter ${event.iteration}] Agent finished.`);
            break;
        case 'usage':
            console.log(`\nTokens:  input=${event.inputTokens.toLocaleString()}  output=${event.outputTokens.toLocaleString()}  total=${event.totalTokens.toLocaleString()}`);
            break;
    }
}

// ─── Output formatting ────────────────────────────────────────────────────────

function fmt(value: number | null | undefined): string {
    if (value == null) return '       —';
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(8);
}

function printTable(result: AgentFinancials): void {
    const unit = `${result.currency} ${result.unit}`;
    console.log(`\nCompany:  ${result.companyName}`);
    console.log(`Issuer:   ${issuerName}`);
    console.log(`Unit:     ${unit}\n`);

    console.log('Year   Revenue     EBIT  Net Profit     Equity  Fin. Debt');
    console.log('────  ────────  ───────  ──────────  ─────────  ─────────');

    for (const y of result.years) {
        const row = [
            String(y.year).padEnd(4),
            fmt(y.revenue),
            fmt(y.ebit),
            fmt(y.netProfit),
            fmt(y.equity),
            fmt(y.financialDebt),
        ].join('  ');
        console.log(row);
    }

    if (result.notes) {
        console.log(`\nNotes: ${result.notes}`);
    }
}

function signalDot(signal: Signal): string {
    switch (signal) {
        case 'green':  return '\x1b[32m●\x1b[0m';
        case 'yellow': return '\x1b[33m●\x1b[0m';
        case 'red':    return '\x1b[31m●\x1b[0m';
        case 'na':     return '\x1b[90m○\x1b[0m';
    }
}

function printScorecard(scorecard: FundamentalScorecard): void {
    console.log('\nFundamental Scorecard:');
    console.log('─'.repeat(50));
    for (const dim of scorecard.dimensions) {
        console.log(`${signalDot(dim.signal)}  ${dim.name}`);
        for (const metric of dim.metrics) {
            console.log(`   ${signalDot(metric.signal)}  ${metric.name.padEnd(26)}${metric.formattedValue}`);
        }
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`Issuer:  ${issuerName}`);
console.log(`Model:   ${MODEL_ID}`);
console.log('─'.repeat(80));

try {
    const result = await analyzeIssuer(
        { bedrockClient, tavilyClient },
        issuerName,
        onEvent
    );

    console.log('\n' + '═'.repeat(60));
    printTable(result.agentFinancials);
    printScorecard(result.scorecard);
    console.log('═'.repeat(60));

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
            scorecard: result.scorecard,
            agentFinancials: result.agentFinancials,
            agentLog: result.agentLog,
            reportMarkdown: result.reportMarkdown,
        });

        console.log(`\nAnalysis stored to DynamoDB (${ISSUER_PROFILES_TABLE_NAME})`);
    } else {
        console.log('\n[DRY RUN] ISSUER_PROFILES_TABLE_NAME not set — skipping DynamoDB write.');
    }
} catch (error) {
    console.error('Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
