import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DbIssuerProfile } from ".";

export class IssuerProfilesTable {
  readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    this.tableName = tableName;
  }

  async store(profile: DbIssuerProfile): Promise<void> {
    console.log(`IssuerProfilesTable: Storing profile for ${profile.issuerName}`);
    await this.dynamoDBDocumentClient.send(new PutCommand({
      TableName: this.tableName,
      Item: profile
    }));
  }

  async get(issuerName: string): Promise<DbIssuerProfile | undefined> {
    console.log(`IssuerProfilesTable: Fetching profile for: ${issuerName}`);
    const result = await this.dynamoDBDocumentClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { issuerName }
    }));
    return result.Item as DbIssuerProfile | undefined;
  }

  async getAll(): Promise<DbIssuerProfile[]> {
    console.log('IssuerProfilesTable: Fetching all issuer profiles');
    const result = await this.dynamoDBDocumentClient.send(new ScanCommand({
      TableName: this.tableName
    }));
    return (result.Items ?? []) as DbIssuerProfile[];
  }
}
