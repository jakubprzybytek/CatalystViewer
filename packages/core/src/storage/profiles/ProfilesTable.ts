import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { DbProfile } from ".";
import { Table } from "sst/node/table";

export class ProfilesTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient);
    this.tableName = tableName;
  }

  async store(profile: DbProfile) {
    console.log(`ProfilesTable: Storing profile for ${profile.userName}`);

    const putCommand = new PutCommand({
      TableName: this.tableName,
      Item: profile
    });

    await this.dynamoDBDocumentClient.send(putCommand);
  }

  async get(userName: string): Promise<DbProfile | undefined> {

    console.log(`ProfilesTable: Fetching profile for: ${userName}`);

    const getCommand = new GetCommand({
      TableName: Table.Profiles.tableName,
      Key: {
        userName
      }
    });

    const result = await this.dynamoDBDocumentClient.send(getCommand);
    return result.Item as DbProfile | undefined;
  }
}
