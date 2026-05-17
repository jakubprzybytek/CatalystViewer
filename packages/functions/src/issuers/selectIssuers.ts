import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { SelectIssuersInput, SelectIssuersResult } from '.';

const logger = new Logger({ serviceName: 'SelectIssuers' });
const dynamoDBClient = new DynamoDBClient({});

export async function handler(input: SelectIssuersInput, context: Context): Promise<SelectIssuersResult> {
    logger.addContext(context);

    // Short-circuit: if specific issuers were provided, use them directly
    if (input.issuers && input.issuers.length > 0) {
        logger.info('Using provided issuer list', { count: input.issuers.length });
        return { selectedIssuers: input.issuers };
    }

    const count = input.count ?? 2;
    logger.info('Selecting issuers by staleness', { count });

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, Resource.BondDetails.name);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const [activeBonds, latestAnalyses] = await Promise.all([
        bondDetailsTable.getActive('Corporate bonds'),
        issuerProfilesTable.getAllLatestAnalyses(),
    ]);

    const uniqueIssuers = [...new Set(activeBonds.map(b => b.issuer))];
    logger.info('Corporate bond issuers found', { total: uniqueIssuers.length });

    const sorted = uniqueIssuers
        .map(issuerName => ({ issuerName, performedAtTs: latestAnalyses.get(issuerName) ?? 0 }))
        .sort((a, b) => a.performedAtTs - b.performedAtTs);

    const selectedIssuers = sorted.slice(0, count).map(i => i.issuerName);
    logger.info('Selected issuers', { selectedIssuers });

    return { selectedIssuers };
}
