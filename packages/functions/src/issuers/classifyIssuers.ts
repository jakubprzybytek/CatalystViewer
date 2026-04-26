import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { CollectIssuersResult, ClassifyIssuersResult, ClassifiedIssuer, FailedIssuer } from '.';

const DEFAULT_MAX_ISSUERS_PER_RUN = 20;

const dynamoDbClient = new DynamoDBClient({});

const bedrockClient = new BedrockRuntimeClient({
    maxAttempts: 1,
});

function resolveClassificationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

export async function handler(input: CollectIssuersResult): Promise<ClassifyIssuersResult> {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const batch = input.forceClassification
        ? input.unclassifiedIssuers
        : input.unclassifiedIssuers.slice(0, resolveClassificationsCap(input.classificationsCap));

    console.log(`ClassifyIssuers: classifying ${batch.length} of ${input.unclassifiedIssuers.length} unclassified issuers${input.forceClassification ? ' (forceClassification=true, cap disabled)' : ` (cap: ${resolveClassificationsCap(input.classificationsCap)})`}`);

    const classifiedIssuers: ClassifiedIssuer[] = [];
    const failedIssuers: FailedIssuer[] = [];

    for (const issuerName of batch) {
        try {
            const classification = await classifyIssuer(bedrockClient, issuerName);

            const now = new Date();
            await issuerProfilesTable.store({
                issuerName,
                industry: classification.industry,
                businessSummary: classification.businessSummary,
                websiteUrl: classification.websiteUrl,
                classifiedAt: now.toISOString(),
                classifiedAtTs: now.getTime(),
                modelId: MODEL_ID,
            });

            classifiedIssuers.push({
                issuerName,
                industry: classification.industry,
                businessSummary: classification.businessSummary,
                websiteUrl: classification.websiteUrl,
                modelId: MODEL_ID,
            });

            console.log(`ClassifyIssuers: classified '${issuerName}' as '${classification.industry}' | ${classification.websiteUrl || 'no url'} | ${classification.businessSummary}`);
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
