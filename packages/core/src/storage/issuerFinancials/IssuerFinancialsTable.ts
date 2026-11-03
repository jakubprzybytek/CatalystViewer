import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DbIssuerFinancialsRecord } from '.';
import { itemTotals } from '../../bonds/fundamentals/filings/statementLines';
import { queryAll, scanAll } from '../utils';
import type { DbIssuerIdentityRecord } from '../issuerProfiles';

// Every attribute but `lines` (20–40 KB a row): the list reads don't need them.
const LIST_ATTRIBUTES = ['entityId', 'krs', 'lei', 'registration', 'period', 'issuerName', 'companyName', 'scope', 'periodStart',
    'periodEnd', 'months', 'currency', 'standard', 'presentedUnit', 'lineSigns', 'figures', 'items', 'column', 'filing', 'review', 'linesExtraction', 'importedAt'];
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

    // An issuer's reports: those of the company whose figures it uses, else (no identity) those under its name.
    async getForIssuer(issuerName: string, identity: DbIssuerIdentityRecord | undefined): Promise<DbIssuerFinancialsRecord[]> {
        return identity ? this.getByEntity(identity.financialsEntityId) : this.getByIssuer(issuerName);
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
    async addLines(entityId: string, period: string, fileKey: string, fields: Pick<DbIssuerFinancialsRecord, 'standard' | 'presentedUnit' | 'lineSigns' | 'lines' | 'review' | 'linesExtraction'>): Promise<boolean> {
        const items = itemTotals(fields.lines ?? [], fields.lineSigns);
        try {
            await this.documentClient.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { entityId, period },
                UpdateExpression: `SET #standard = :standard, #unit = :unit, #signs = :signs, #lines = :lines, #items = :items, #review = if_not_exists(#review, :review)${fields.linesExtraction ? ', #linesExtraction = :linesExtraction' : ''}`,
                ConditionExpression: '#filing.#key = :key',
                ExpressionAttributeNames: { '#standard': 'standard', '#unit': 'presentedUnit', '#signs': 'lineSigns', '#lines': 'lines', '#items': 'items', '#review': 'review', '#filing': 'filing', '#key': 'key', ...(fields.linesExtraction ? { '#linesExtraction': 'linesExtraction' } : {}) },
                ExpressionAttributeValues: { ':standard': fields.standard, ':unit': fields.presentedUnit, ':signs': fields.lineSigns, ':lines': fields.lines, ':items': items, ':review': fields.review, ':key': fileKey, ...(fields.linesExtraction ? { ':linesExtraction': fields.linesExtraction } : {}) },
            }));
            return true;
        } catch (error) {
            if (error instanceof ConditionalCheckFailedException) return false;
            throw error;
        }
    }

    // Stores a year's item totals (from its stored lines), leaving everything else alone.
    async setItems(entityId: string, period: string, items: NonNullable<DbIssuerFinancialsRecord['items']>): Promise<void> {
        await this.documentClient.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { entityId, period },
            UpdateExpression: 'SET #items = :items',
            ConditionExpression: 'attribute_exists(#entityId)',
            ExpressionAttributeNames: { '#items': 'items', '#entityId': 'entityId' },
            ExpressionAttributeValues: { ':items': items },
        }));
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
                Item: record.lines ? { ...record, items: itemTotals(record.lines, record.lineSigns) } : record,
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
