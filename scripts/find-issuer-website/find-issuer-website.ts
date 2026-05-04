import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop, type AgentEvent } from '@core/ai/agent/index';
import { WebSearchTool } from '@core/ai/tools/WebSearchTool';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { MODEL_ID } from '@core/ai/issuers/IssuerClassification';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const issuerName = process.argv[2];

if (!issuerName) {
    console.error('Usage: pnpm tsx find-issuer-website.ts "<Issuer Name>"');
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

const taskPrompt = `Find the official website URL of the Polish company with legal name "${issuerName}". Search the web to confirm it. Return only the URL, nothing else.`;

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
            console.log(`\n[iter ${event.iteration}] Agent answered: ${event.text}`);
            break;
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`Issuer:    ${issuerName}`);
console.log(`Model:     ${MODEL_ID}`);
console.log(`Task:      ${taskPrompt}`);
console.log('─'.repeat(80));

try {
    const website = await agentLoop.run(taskPrompt, onEvent);

    console.log('\n' + '─'.repeat(80));
    console.log(`Issuer:  ${issuerName}`);
    console.log(`Website: ${website}`);
} catch (error) {
    console.error('Agent failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
