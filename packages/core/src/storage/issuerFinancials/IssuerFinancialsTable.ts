import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { DbIssuerFinancialsRecord } from '.';
import { queryAll, scanAll } from '../utils';

export class IssuerFinancialsTable {
    readonly documentClient: DynamoDBDocumentClient;

    constructor(dynamoDBClient: DynamoDBClient, readonly tableName: string) {
        this.documentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
    }

    // The whole table: a few rows per issuer, small (no raw documents).
    async getAll(): Promise<DbIssuerFinancialsRecord[]> {
        const result = await scanAll(this.documentClient, new ScanCommand({ TableName: this.tableName }));
        return (result.Items ?? []) as DbIssuerFinancialsRecord[];
    }

    async getByEntity(entityId: string): Promise<DbIssuerFinancialsRecord[]> {
        const result = await queryAll(this.documentClient, new QueryCommand({
            TableName: this.tableName,
            KeyConditionExpression: 'entityId = :entityId',
            ExpressionAttributeValues: { ':entityId': entityId },
        }));
        return (result.Items ?? []) as DbIssuerFinancialsRecord[];
    }

    // A year from a filing's own column always wins. A comparative column only fills a year that has
    // no row yet, or one that also came from a comparative column. Returns false when it was skipped.
    async store(record: DbIssuerFinancialsRecord): Promise<boolean> {
        try {
            await this.documentClient.send(new PutCommand({
                TableName: this.tableName,
                Item: record,
                ...(record.column === 'previous' ? {
                    ConditionExpression: 'attribute_not_exists(entityId) OR #column = :previous',
                    ExpressionAttributeNames: { '#column': 'column' },
                    ExpressionAttributeValues: { ':previous': 'previous' },
                } : {}),
            }));
            return true;
        } catch (error) {
            if (error instanceof ConditionalCheckFailedException) return false;
            throw error;
        }
    }
}
