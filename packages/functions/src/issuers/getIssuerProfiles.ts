import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const issuerProfiles = await issuerProfilesTable.getAll();

    return Success({ issuerProfiles });
});