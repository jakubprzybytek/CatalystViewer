import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

// export const MODEL_ID = 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/eu.anthropic.claude-haiku-4-5-20251001-v1:0';
export const MODEL_ID = 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/eu.anthropic.claude-sonnet-4-6';

export const INDUSTRY_LABELS = [
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

export type Industry = typeof INDUSTRY_LABELS[number];

export type ClassificationResponse = {
    industry: Industry;
    businessSummary: string;
    websiteUrl: string;
};

function buildPrompt(issuerName: string): string {
    return `You are a financial analyst with deep knowledge of Polish companies and the Catalyst bond market.

Your task is to classify the company below. The name provided is the legal registered name (e.g. "P4 Sp. z o.o." is the legal entity behind the Play mobile network). Use your training knowledge to identify the real-world company behind the legal name, including its brand name, actual business activity, and official website.

Company name: "${issuerName}"

Instructions:
- Identify what real-world company or brand this legal entity corresponds to.
- Choose the industry that best describes its PRIMARY business activity.
- Write a 2-3 sentence business summary in English based on what you know about the company.
- Provide the company's real, publicly known official website URL. Do NOT guess or fabricate a URL — only use URLs you are confident exist (e.g. https://www.play.pl for P4 Sp. z o.o.). If you are not confident, use an empty string.

Respond with a JSON object only, no markdown, no explanation. Use this exact structure:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>",
  "websiteUrl": "<the company's confirmed official website URL, or empty string if unknown>"
}`;
}

function parseClassificationResponse(text: string): ClassificationResponse {
    let parsed: unknown;
    try {
        const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        parsed = JSON.parse(stripped);
    } catch {
        console.error(`parseClassificationResponse: raw model output:\n${text}`);
        throw new Error('InvalidResponseFormat: response is not valid JSON');
    }
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
