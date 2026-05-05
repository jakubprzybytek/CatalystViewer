import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop } from '../agent/AgentLoop';
import { WebSearchTool } from '../tools/WebSearchTool';
import { TavilyClient } from '../tools/tavily/TavilyClient';

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
    return `You are a financial analyst researching Polish companies that issue bonds on the Catalyst bond market.

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
}

function parseClassificationResponse(text: string): ClassificationResponse {
    let parsed: unknown;
    try {
        const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
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

export async function classifyIssuer(
    bedrockClient: BedrockRuntimeClient,
    tavilyClient: TavilyClient,
    issuerName: string,
): Promise<ClassificationResponse> {
    const webSearchTool = new WebSearchTool(tavilyClient);
    const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [webSearchTool]);

    const rawText = await agentLoop.run(buildPrompt(issuerName));

    return parseClassificationResponse(rawText);
}
