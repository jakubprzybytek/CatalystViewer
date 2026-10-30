import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { runClassification } from '@core/ai/issuers/IssuerAI';
import { ClassifyIssuerInput, ClassifyIssuerResult } from '.';

const logger = new Logger({ serviceName: 'ClassifyIssuer' });

const dynamoDbClient = new DynamoDBClient({});

export async function handler(input: ClassifyIssuerInput, context: Context): Promise<ClassifyIssuerResult> {
    logger.addContext(context);

    const { issuerName } = input;

    logger.info('Classifying issuer', { issuerName });

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    // Same call as `npm run classify-issuer` (docs/development.md).
    const { modelId, ...classification } = await runClassification(issuerName);

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
