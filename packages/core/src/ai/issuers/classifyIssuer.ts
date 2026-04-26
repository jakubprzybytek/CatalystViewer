import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// EU Amazon Nova Lite inference profile - system-defined, actively maintained
// Available across eu-central-1, eu-west-1, eu-west-3, eu-north-1
export const MODEL_ID = 'eu.amazon.nova-lite-v1:0';

export const INDUSTRY_LABELS = [
    'Developer',
    'Finance',
    'Health Services',
    'Energy',
    'Retail',
    'Manufacturing',
    'Municipal',
    'Other',
] as const;

export type Industry = typeof INDUSTRY_LABELS[number];

export type ClassificationResponse = {
    industry: Industry;
    businessSummary: string;
    websiteUrl: string;
};

function buildPrompt(issuerName: string): string {
    return `You are a financial analyst. Classify the following company that issues bonds on the Polish Catalyst bond market.

Company name: "${issuerName}"

Respond with a JSON object only, no markdown, no explanation. Use this exact structure:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>",
  "websiteUrl": "<the company's official website URL, e.g. https://www.example.com>"
}`;
}

function parseClassificationResponse(text: string): ClassificationResponse {
    const parsed = JSON.parse(text.trim()) as unknown;
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('industry' in parsed) ||
        !('businessSummary' in parsed) ||
        !('websiteUrl' in parsed) ||
        typeof (parsed as Record<string, unknown>).industry !== 'string' ||
        typeof (parsed as Record<string, unknown>).businessSummary !== 'string' ||
        typeof (parsed as Record<string, unknown>).websiteUrl !== 'string'
    ) {
        throw new Error('InvalidResponseFormat: missing or wrong-typed fields');
    }
    const { industry, businessSummary, websiteUrl } = parsed as { industry: string; businessSummary: string; websiteUrl: string };
    if (!(INDUSTRY_LABELS as readonly string[]).includes(industry)) {
        throw new Error(`InvalidResponseFormat: unknown industry label "${industry}"`);
    }
    return { industry: industry as Industry, businessSummary, websiteUrl };
}

export async function classifyIssuer(bedrockClient: BedrockRuntimeClient, issuerName: string): Promise<ClassificationResponse> {
    const response = await bedrockClient.send(new ConverseCommand({
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
        throw new Error('InvalidResponseFormat: empty response from model');
    }

    return parseClassificationResponse(rawText);
}
