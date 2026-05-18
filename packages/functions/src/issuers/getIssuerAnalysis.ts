import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { lambdaHandler, Success, Failure } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async (event) => {
    const issuerName = decodeURIComponent(event.pathParameters?.name ?? '');

    if (!issuerName) {
        return Failure('Not found', 404);
    }

    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const analysis = await issuerProfilesTable.getLatestAnalysis(issuerName);

    if (!analysis) {
        return Failure('Not found', 404);
    }

    return Success({ reportMarkdown: analysis.reportMarkdown ?? '' });
});
