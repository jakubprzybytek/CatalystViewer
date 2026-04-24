import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const MODEL_ID = 'eu.amazon.nova-lite-v1:0';

const INDUSTRY_LABELS = [
    'Developer',
    'Finance',
    'Health Services',
    'Energy',
    'Retail',
    'Manufacturing',
    'Municipal',
    'Other',
] as const;

function buildPrompt(issuerName: string): string {
    return `You are a financial analyst. Classify the following company that issues bonds on the Polish Catalyst bond market.

Company name: "${issuerName}"

Respond with a JSON object only, no markdown, no explanation. Use this exact structure:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>"
}`;
}

async function classifyIssuer(issuerName: string) {
    console.log(`\n=== Testing Classification for: ${issuerName} ===\n`);

    const client = new BedrockRuntimeClient({
        maxAttempts: 1,
    });

    try {
        console.log('Sending request to Bedrock...\n');
        const response = await client.send(new ConverseCommand({
            modelId: MODEL_ID,
            messages: [
                {
                    role: 'user',
                    content: [{ text: buildPrompt(issuerName) }],
                },
            ],
        }));

        const rawText = response.output?.message?.content?.[0]?.text;
        if (!rawText) {
            throw new Error('Empty response from Bedrock');
        }

        console.log('Raw response from Bedrock:');
        console.log(rawText);
        console.log('\n---\n');

        const parsed = JSON.parse(rawText);
        console.log('Parsed classification:');
        console.log(JSON.stringify(parsed, null, 2));

        return parsed;
    } catch (error) {
        console.error('Error during classification:', error);
        throw error;
    }
}

// Run test
classifyIssuer('Kruk S.A.')
    .then(() => {
        console.log('\n✓ Classification test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n✗ Classification test failed:', error);
        process.exit(1);
    });
