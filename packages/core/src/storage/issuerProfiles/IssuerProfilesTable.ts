import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DbIssuerProfileRecord, DbIssuerAnalysisRecord } from '.';
import { scanAll, queryAll } from '../utils';

export class IssuerProfilesTable {
    readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
    readonly tableName: string;

    constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
        this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true }
        });
        this.tableName = tableName;
    }

    async getProfiles(): Promise<DbIssuerProfileRecord[]> {
        console.log('IssuerProfilesTable: Fetching all issuer profiles');

        const startTimestamp = new Date().getTime();

        const scanCommand = new ScanCommand({
            TableName: this.tableName,
            FilterExpression: 'recordType = :rt',
            ExpressionAttributeValues: { ':rt': '#PROFILE' },
        });

        const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
        const endTimestamp = new Date().getTime();
        console.log(`IssuerProfilesTable: Returning ${result.Count ?? 0} profiles in ${endTimestamp - startTimestamp} ms.`);

        return result.Items ? result.Items as DbIssuerProfileRecord[] : [];
    }

    // Kept for backwards-compat — delegates to getProfiles()
    async getAll(): Promise<DbIssuerProfileRecord[]> {
        return this.getProfiles();
    }

    async storeProfile(profile: DbIssuerProfileRecord): Promise<void> {
        console.log(`IssuerProfilesTable: Storing profile for '${profile.issuerName}'`);

        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: profile,
        }));
    }

    // Kept for backwards-compat — delegates to storeProfile()
    async store(profile: DbIssuerProfileRecord): Promise<void> {
        return this.storeProfile(profile);
    }

    async storeAnalysis(analysis: DbIssuerAnalysisRecord): Promise<void> {
        console.log(`IssuerProfilesTable: Storing analysis for '${analysis.issuerName}' at ${analysis.performedAt}`);

        // Write the timestamped row
        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: analysis,
        }));

        // Overwrite the #LATEST_ANALYSIS mirror
        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: { ...analysis, recordType: '#LATEST_ANALYSIS' },
        }));
    }

    async getLatestAnalysis(issuerName: string): Promise<DbIssuerAnalysisRecord | undefined> {
        const result = await this.dynamoDBDocumentClient.send(new GetCommand({
            TableName: this.tableName,
            Key: { issuerName, recordType: '#LATEST_ANALYSIS' },
        }));

        return result.Item as DbIssuerAnalysisRecord | undefined;
    }

    async getAnalysisHistory(issuerName: string): Promise<DbIssuerAnalysisRecord[]> {
        const queryCommand = new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'issuerName = :name AND begins_with(recordType, :prefix)',
            ExpressionAttributeValues: {
                ':name': issuerName,
                ':prefix': '#ANALYSIS#',
            },
            ScanIndexForward: false,
        });

        const result = await queryAll(this.dynamoDBDocumentClient, queryCommand);
        return result.Items ? result.Items as DbIssuerAnalysisRecord[] : [];
    }
}
