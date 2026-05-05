import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { CollectIssuersResult, ClassifyIssuersResult, ClassifiedIssuer, FailedIssuer } from '.';

const logger = new Logger({ serviceName: 'ClassifyIssuers' });

const DEFAULT_MAX_ISSUERS_PER_RUN = 20;

const dynamoDbClient = new DynamoDBClient({});

const bedrockClient = new BedrockRuntimeClient({
    maxAttempts: 1,
});

const tavilyClient = new TavilyClient(process.env.TAVILY_API_KEY ?? '');

function resolveClassificationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

export async function handler(input: CollectIssuersResult, context: Context): Promise<ClassifyIssuersResult> {
    logger.addContext(context);

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const batch = input.forceClassification
        ? input.unclassifiedIssuers
        : input.unclassifiedIssuers.slice(0, resolveClassificationsCap(input.classificationsCap));

    logger.info('Classifying issuers', { batchSize: batch.length, totalUnclassified: input.unclassifiedIssuers.length, forceClassification: input.forceClassification ?? false, cap: input.forceClassification ? null : resolveClassificationsCap(input.classificationsCap) });

    const classifiedIssuers: ClassifiedIssuer[] = [];
    const failedIssuers: FailedIssuer[] = [];

    for (const issuerName of batch) {
        try {
            const classification = await classifyIssuer(bedrockClient, tavilyClient, issuerName);

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

            const classifiedIssuer: ClassifiedIssuer = {
                issuerName,
                industry: classification.industry,
                businessSummary: classification.businessSummary,
                websiteUrl: classification.websiteUrl,
                modelId: MODEL_ID,
            };

            classifiedIssuers.push(classifiedIssuer);

            logger.info('Issuer classified', classifiedIssuer);
        } catch (error) {
            const errorReason = error instanceof Error ? error.message : String(error);
            logger.error('Failed to classify issuer', { issuerName, errorReason });
            failedIssuers.push({ issuerName, errorReason });
        }
    }

    logger.info('Classification done', { classified: classifiedIssuers.length, failed: failedIssuers.length });

    return {
        ...input,
        classifiedIssuers,
        failedIssuers,
    };
}
