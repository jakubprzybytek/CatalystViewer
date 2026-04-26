import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { CollectIssuersResult, ClassifyIssuersResult, ClassifiedIssuer, FailedIssuer } from '.';

// EU Amazon Nova Lite inference profile - system-defined, actively maintained
// Available across eu-central-1, eu-west-1, eu-west-3, eu-north-1
const MODEL_ID = 'eu.amazon.nova-lite-v1:0';
const DEFAULT_MAX_ISSUERS_PER_RUN = 20;

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

type Industry = typeof INDUSTRY_LABELS[number];

type ClassificationResponse = {
    industry: Industry;
    businessSummary: string;
};

function buildPrompt(issuerName: string): string {
    return `You are a financial analyst. Classify the following company that issues bonds on the Polish Catalyst bond market.

Company name: "${issuerName}"

Respond with a JSON object only, no markdown, no explanation. Use this exact structure:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>"
}`;
}

function parseClassificationResponse(text: string): ClassificationResponse {
    const parsed = JSON.parse(text.trim()) as unknown;
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('industry' in parsed) ||
        !('businessSummary' in parsed) ||
        typeof (parsed as Record<string, unknown>).industry !== 'string' ||
        typeof (parsed as Record<string, unknown>).businessSummary !== 'string'
    ) {
        throw new Error('InvalidResponseFormat: missing or wrong-typed fields');
    }
    const { industry, businessSummary } = parsed as { industry: string; businessSummary: string };
    if (!(INDUSTRY_LABELS as readonly string[]).includes(industry)) {
        throw new Error(`InvalidResponseFormat: unknown industry label "${industry}"`);
    }
    return { industry: industry as Industry, businessSummary };
}

const dynamoDbClient = new DynamoDBClient({});

const bedrockClient = new BedrockRuntimeClient({
    maxAttempts: 1,
});

function resolveClassyficationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

export async function handler(input: CollectIssuersResult): Promise<ClassifyIssuersResult> {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);
    const classyficationsCap = resolveClassyficationsCap(input.classyficationsCap);

    const batch = input.unclassifiedIssuers.slice(0, classyficationsCap);
    console.log(`ClassifyIssuers: classifying ${batch.length} of ${input.unclassifiedIssuers.length} unclassified issuers (cap: ${classyficationsCap})`);

    const classifiedIssuers: ClassifiedIssuer[] = [];
    const failedIssuers: FailedIssuer[] = [];

    for (const issuerName of batch) {
        try {
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

            const classification = parseClassificationResponse(rawText);

            await issuerProfilesTable.store({
                issuerName,
                industry: classification.industry,
                businessSummary: classification.businessSummary,
                classifiedAt: Date.now(),
                modelId: MODEL_ID,
            });

            classifiedIssuers.push({
                issuerName,
                industry: classification.industry,
                businessSummary: classification.businessSummary,
                modelId: MODEL_ID,
            });

            console.log(`ClassifyIssuers: classified '${issuerName}' as '${classification.industry}'`);
        } catch (error) {
            const errorReason = error instanceof Error ? error.message : String(error);
            console.error(`ClassifyIssuers: failed to classify '${issuerName}': ${errorReason}`);
            failedIssuers.push({ issuerName, errorReason });
        }
    }

    console.log(`ClassifyIssuers: done — ${classifiedIssuers.length} classified, ${failedIssuers.length} failed`);

    return {
        ...input,
        classifiedIssuers,
        failedIssuers,
    };
}
