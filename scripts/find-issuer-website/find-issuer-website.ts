import dotenv from 'dotenv';
dotenv.config({ path: new URL('.env.local', import.meta.url).pathname });

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

// ─── Trace collection ─────────────────────────────────────────────────────────

const traceLines: string[] = [];

function onEvent(event: AgentEvent): void {
    const pad = (s: string, n: number) => s.padEnd(n);
    const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '...' : s;

    switch (event.type) {
        case 'tool_use':
            traceLines.push(
                `[${event.iteration}] ${pad('tool_use', 12)} ${pad(event.toolName, 12)} ${truncate(JSON.stringify(event.input), 80)}`
            );
            break;
        case 'tool_result':
            traceLines.push(
                `[${event.iteration}] ${pad('tool_result', 12)} ${''.padEnd(12)} ${truncate(event.result, 80)}`
            );
            break;
        case 'end_turn':
            traceLines.push(
                `[${event.iteration}] ${pad('end_turn', 12)} ${''.padEnd(12)} ${event.text}`
            );
            break;
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

try {
    const website = await agentLoop.run(taskPrompt, onEvent);

    console.log(`Issuer:  ${issuerName}`);
    console.log(`Website: ${website}`);
    console.log();
    console.log('--- Agent trace ---');
    for (const line of traceLines) {
        console.log(line);
    }
} catch (error) {
    console.error('Agent failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
