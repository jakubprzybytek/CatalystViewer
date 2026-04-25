import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable, DbIssuerProfile } from '@core/storage/issuerProfiles';

const dynamoDbClient = new DynamoDBClient({});

export async function handler(): Promise<{ issuerProfiles: DbIssuerProfile[] }> {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);
    const issuerProfiles = await issuerProfilesTable.getAll();
    return { issuerProfiles };
}
