import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { classifyIssuer, MODEL_ID } from '../ai/issuers/index';
import { TavilyClient } from '../ai/tools/tavily/TavilyClient';

// ─── CLI args ─────────────────────────────────────────────────────────────────

const issuerName = process.argv[2];

if (!issuerName) {
    console.error('Usage: npm run classify-issuer -- "<Issuer Name>"');
    process.exit(1);
}

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
    console.error('Error: TAVILY_API_KEY environment variable is not set.');
    process.exit(1);
}

// ─── Core ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
    console.log(`Classifying: "${issuerName}"\n`);

    const bedrockClient = new BedrockRuntimeClient({ maxAttempts: 2 });
    const tavilyClient = new TavilyClient(tavilyApiKey!);

    const result = await classifyIssuer(bedrockClient, tavilyClient, issuerName);

    console.log('Classification result:');
    console.log(`  Industry:         ${result.industry}`);
    console.log(`  Business summary: ${result.businessSummary}`);
    console.log(`  Website:          ${result.websiteUrl}`);
    console.log(`  Model:            ${MODEL_ID}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

run().catch((error) => {
    console.error('\nFailed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
