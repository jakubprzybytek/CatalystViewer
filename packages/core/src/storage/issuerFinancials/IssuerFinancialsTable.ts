import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { DbIssuerFinancials } from '.';
import { scanAll } from '../utils';

export class IssuerFinancialsTable {
    readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
    readonly tableName: string;

    constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
        this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true }
        });
        this.tableName = tableName;
    }

    async getAll(): Promise<DbIssuerFinancials[]> {
        console.log('IssuerFinancialsTable: Fetching all issuer financials');

        const startTimestamp = new Date().getTime();

        const scanCommand = new ScanCommand({
            TableName: this.tableName,
        });

        const result = await scanAll(this.dynamoDBDocumentClient, scanCommand);
        const endTimestamp = new Date().getTime();
        console.log(`IssuerFinancialsTable: Returning ${result.Count ?? 0} records in ${endTimestamp - startTimestamp} ms.`);

        return result.Items ? result.Items as DbIssuerFinancials[] : [];
    }

    async getByIssuer(issuerName: string): Promise<DbIssuerFinancials[]> {
        console.log(`IssuerFinancialsTable: Fetching financials for '${issuerName}'`);

        const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'issuerName = :name',
            ExpressionAttributeValues: { ':name': issuerName },
        }));

        return result.Items ? result.Items as DbIssuerFinancials[] : [];
    }

    async store(financials: DbIssuerFinancials): Promise<void> {
        console.log(`IssuerFinancialsTable: Storing financials for '${financials.issuerName}' year ${financials.year}`);

        await this.dynamoDBDocumentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: financials,
        }));
    }
}
