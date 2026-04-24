import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DbIssuerProfile } from '.';
import { scanAll } from '../utils';

export class IssuerProfilesTable {
    readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
    readonly tableName: string;

    constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
        this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true }
        });
        this.tableName = tableName;
    }

    async getAll(): Promise<DbIssuerProfile[]> {
        console.log('IssuerProfilesTable: Fetching all issuer profiles');

        const startTimestamp = new Date().getTime();

        const scanCommand = new ScanCommand({
            TableName: this.tableName,
        });

        const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
        const endTimestamp = new Date().getTime();
        console.log(`IssuerProfilesTable: Returning ${result.Count ?? 0} profiles in ${endTimestamp - startTimestamp} ms.`);

        return result.Items ? result.Items as DbIssuerProfile[] : [];
    }

    async store(profile: DbIssuerProfile): Promise<void> {
        console.log(`IssuerProfilesTable: Storing profile for '${profile.issuerName}'`);

        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: profile,
        }));
    }
}
