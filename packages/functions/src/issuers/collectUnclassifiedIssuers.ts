import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { UpdateBondsResult } from '../bonds';
import { ClassificationConfig, CollectIssuersResult } from '.';

const logger = new Logger({ serviceName: 'CollectUnclassifiedIssuers' });

const DEFAULT_MAX_ISSUERS_PER_RUN = 10;

const dynamoDbClient = new DynamoDBClient({});

function resolveClassificationsCap(value: number | undefined): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return DEFAULT_MAX_ISSUERS_PER_RUN;
    }
    return Math.max(0, Math.floor(value));
}

export async function handler(input: UpdateBondsResult & ClassificationConfig, context: Context): Promise<CollectIssuersResult> {
    logger.addContext(context);

    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, Resource.BondDetails.name);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const [activeBonds, existingProfiles] = await Promise.all([
        bondDetailsTable.getAllActive(),
        issuerProfilesTable.getProfiles(),
    ]);

    const allIssuers = [...new Set(activeBonds.map(b => b.issuer))];

    if (input.forceClassification) {
        logger.info('Force classification enabled, returning all issuers', { totalIssuers: allIssuers.length });
        return {
            ...input,
            unclassifiedIssuers: allIssuers,
        };
    }

    const classifiedIssuers = new Set(existingProfiles.map(p => p.issuerName));
    const allUnclassifiedIssuers = allIssuers.filter(issuer => !classifiedIssuers.has(issuer));
    const cap = resolveClassificationsCap(input.classificationsCap);
    const unclassifiedIssuers = allUnclassifiedIssuers.slice(0, cap);

    logger.info('Unclassified issuers collected', {
        totalIssuers: allIssuers.length,
        alreadyClassified: classifiedIssuers.size,
        toClassify: allUnclassifiedIssuers.length,
        cap,
        cappedTo: unclassifiedIssuers.length,
    });

    return {
        ...input,
        unclassifiedIssuers,
    };
}
