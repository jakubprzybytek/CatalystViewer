import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { aiStubbed, STUB_MODEL_ID, stubClassification } from '@core/ai/issuers/IssuerStubs';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { ClassifyIssuerInput, ClassifyIssuerResult } from '.';

const logger = new Logger({ serviceName: 'ClassifyIssuer' });

const dynamoDbClient = new DynamoDBClient({});

const bedrockClient = new BedrockRuntimeClient({
    maxAttempts: 1,
});

const tavilyClient = new TavilyClient(process.env.TAVILY_API_KEY ?? '');

export async function handler(input: ClassifyIssuerInput, context: Context): Promise<ClassifyIssuerResult> {
    logger.addContext(context);

    const { issuerName } = input;

    logger.info('Classifying issuer', { issuerName });

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const stubbed = aiStubbed();
    const classification = stubbed ? stubClassification(issuerName) : await classifyIssuer(bedrockClient, tavilyClient, issuerName);
    const modelId = stubbed ? STUB_MODEL_ID : MODEL_ID;

    const now = new Date();
    await issuerProfilesTable.storeProfile({
        issuerName,
        recordType: '#PROFILE',
        industry: classification.industry,
        businessSummary: classification.businessSummary,
        websiteUrl: classification.websiteUrl,
        classifiedAt: now.toISOString(),
        classifiedAtTs: now.getTime(),
        modelId,
    });

    const result: ClassifyIssuerResult = {
        success: true,
        issuerName,
        industry: classification.industry,
        businessSummary: classification.businessSummary,
        websiteUrl: classification.websiteUrl,
        modelId,
    };

    logger.info('Issuer classified', { issuerName, industry: classification.industry });

    return result;
}
