import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop, type AgentEvent } from '@core/ai/agent/index';
import { WebSearchTool } from '@core/ai/tools/WebSearchTool';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { MODEL_ID } from '@core/ai/issuers/IssuerClassification';

// ─── Industry labels (mirrors IssuerClassification.ts) ────────────────────────

const INDUSTRY_LABELS = [
    'Developer',
    'Finance',
    'Health Services',
    'Energy',
    'Retail',
    'Manufacturing',
    'Municipal',
    'Telecommunications',
    'Transportation & Logistics',
    'Media',
    'Construction',
    'Other',
] as const;

type ClassificationResult = {
    industry: string;
    businessSummary: string;
    websiteUrl: string;
};

function parseResult(text: string): ClassificationResult {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Response does not contain a JSON object');
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
        typeof parsed['industry'] !== 'string' ||
        typeof parsed['businessSummary'] !== 'string' ||
        typeof parsed['websiteUrl'] !== 'string'
    ) {
        throw new Error('Response missing required fields');
    }
    return {
        industry: parsed['industry'],
        businessSummary: parsed['businessSummary'],
        websiteUrl: parsed['websiteUrl'],
    };
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

const issuerName = process.argv[2];

if (!issuerName) {
    console.error('Usage: npx tsx find-issuer-website.ts "<Issuer Name>"');
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
const tavilyClient = new TavilyClient(tavilyApiKey);
const webSearchTool = new WebSearchTool(tavilyClient);
const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [webSearchTool]);

const taskPrompt = `You are a financial analyst researching Polish companies that issue bonds on the Catalyst bond market.

Your task is to research the company below using web search, then classify it.

Company name: "${issuerName}"

The name provided is the legal registered name (e.g. "P4 Sp. z o.o." is the legal entity behind the Play mobile network).

Instructions:
1. Search the web to identify the real-world company or brand behind this legal name.
2. Search for its official website, main business activity, and any recent information.
3. Based on your search results, classify the company:
   - Choose the industry that best describes its PRIMARY business activity.
   - Write a 2-3 sentence business summary in English based on current web data.
   - Use the confirmed official website URL from the search results.

Respond with a JSON object ONLY — no markdown, no explanation:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>",
  "websiteUrl": "<the company's official website URL confirmed from search results, or empty string if not found>"
}`;

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
            } else {
                console.log(`           Result: ${truncate(event.result, 120)}`);
            }
            break;
        }
        case 'end_turn':
            console.log(`\n[iter ${event.iteration}] Agent finished.`);
            break;
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`Issuer:  ${issuerName}`);
console.log(`Model:   ${MODEL_ID}`);
console.log('─'.repeat(80));

try {
    const rawAnswer = await agentLoop.run(taskPrompt, onEvent);
    const result = parseResult(rawAnswer);

    console.log('\n' + '─'.repeat(80));
    console.log(`Issuer:    ${issuerName}`);
    console.log(`Industry:  ${result.industry}`);
    console.log(`Website:   ${result.websiteUrl || '(none)'}`);
    console.log(`Summary:   ${result.businessSummary}`);
} catch (error) {
    console.error('Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
