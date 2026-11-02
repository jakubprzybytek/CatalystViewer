import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DbIssuerFinancialsRecord } from '.';
import { queryAll, scanAll } from '../utils';

// Every attribute but `lines` (20–40 KB a row): the list reads don't need them.
const LIST_ATTRIBUTES = ['entityId', 'krs', 'lei', 'registration', 'period', 'issuerName', 'companyName', 'scope', 'periodStart',
    'periodEnd', 'months', 'currency', 'standard', 'presentedUnit', 'lineSigns', 'figures', 'column', 'filing', 'review', 'importedAt'];
const LIST_PROJECTION = {
    ProjectionExpression: LIST_ATTRIBUTES.map((_, i) => `#a${i}`).join(', '),
    ExpressionAttributeNames: Object.fromEntries(LIST_ATTRIBUTES.map((name, i) => [`#a${i}`, name])),
};

export class IssuerFinancialsTable {
    readonly documentClient: DynamoDBDocumentClient;

    constructor(dynamoDBClient: DynamoDBClient, readonly tableName: string) {
        this.documentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
            marshallOptions: { removeUndefinedValues: true },
        });
    }

    // The whole table without statement lines: a few rows per issuer.
    async getAll(): Promise<DbIssuerFinancialsRecord[]> {
        const result = await scanAll(this.documentClient, new ScanCommand({ TableName: this.tableName, ...LIST_PROJECTION }));
        return (result.Items ?? []) as DbIssuerFinancialsRecord[];
    }

    // One issuer's rows (scan with a filter: the table holds a few rows per issuer).
    async getByIssuer(issuerName: string): Promise<DbIssuerFinancialsRecord[]> {
        const result = await scanAll(this.documentClient, new ScanCommand({
            TableName: this.tableName,
            ...LIST_PROJECTION,
            FilterExpression: '#issuerName = :issuerName',
            ExpressionAttributeNames: { ...LIST_PROJECTION.ExpressionAttributeNames, '#issuerName': 'issuerName' },
            ExpressionAttributeValues: { ':issuerName': issuerName },
        }));
        return (result.Items ?? []) as DbIssuerFinancialsRecord[];
    }

    async getByEntity(entityId: string): Promise<DbIssuerFinancialsRecord[]> {
        const result = await queryAll(this.documentClient, new QueryCommand({
            TableName: this.tableName,
            ...LIST_PROJECTION,
            KeyConditionExpression: '#entityId = :entityId',
            ExpressionAttributeNames: { ...LIST_PROJECTION.ExpressionAttributeNames, '#entityId': 'entityId' },
            ExpressionAttributeValues: { ':entityId': entityId },
        }));
        return (result.Items ?? []) as DbIssuerFinancialsRecord[];
    }

    // One year with its statement lines.
    async get(entityId: string, period: string): Promise<DbIssuerFinancialsRecord | undefined> {
        const result = await this.documentClient.send(new GetCommand({ TableName: this.tableName, Key: { entityId, period } }));
        return result.Item as DbIssuerFinancialsRecord | undefined;
    }

    // Adds statement lines and the fields that came with them to a stored year, leaving its figures alone.
    // Only when the row still comes from the same file (it may have been replaced meanwhile).
    async addLines(entityId: string, period: string, fileKey: string, fields: Pick<DbIssuerFinancialsRecord, 'standard' | 'presentedUnit' | 'lineSigns' | 'lines' | 'review'>): Promise<boolean> {
        try {
            await this.documentClient.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { entityId, period },
                UpdateExpression: 'SET #standard = :standard, #unit = :unit, #signs = :signs, #lines = :lines, #review = if_not_exists(#review, :review)',
                ConditionExpression: '#filing.#key = :key',
                ExpressionAttributeNames: { '#standard': 'standard', '#unit': 'presentedUnit', '#signs': 'lineSigns', '#lines': 'lines', '#review': 'review', '#filing': 'filing', '#key': 'key' },
                ExpressionAttributeValues: { ':standard': fields.standard, ':unit': fields.presentedUnit, ':signs': fields.lineSigns, ':lines': fields.lines, ':review': fields.review, ':key': fileKey },
            }));
            return true;
        } catch (error) {
            if (error instanceof ConditionalCheckFailedException) return false;
            throw error;
        }
    }

    // Marks a year as checked by hand (or flagged).
    async setReview(entityId: string, period: string, review: NonNullable<DbIssuerFinancialsRecord['review']>): Promise<void> {
        await this.documentClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { entityId, period },
            UpdateExpression: 'SET #review = :review',
            ConditionExpression: 'attribute_exists(#entityId)',
            ExpressionAttributeNames: { '#review': 'review', '#entityId': 'entityId' },
            ExpressionAttributeValues: { ':review': review },
        }));
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
