import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const [issuerProfiles, analysisSummaries] = await Promise.all([
        issuerProfilesTable.getProfiles(),
        issuerProfilesTable.getAllLatestAnalysisSummaries(),
    ]);

    const analysisByIssuer = new Map(analysisSummaries.map(s => [s.issuerName, s]));

    const mergedProfiles = issuerProfiles.map(profile => ({
        ...profile,
        scorecard: analysisByIssuer.get(profile.issuerName)?.scorecard,
        performedAt: analysisByIssuer.get(profile.issuerName)?.performedAt,
    }));

    return Success({ issuerProfiles: mergedProfiles });
});