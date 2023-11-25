import { DynamoDBClient, GetItemCommand, GetItemInput, PutItemCommand, PutItemInput } from "@aws-sdk/client-dynamodb";
import { DbProfile } from ".";
import { Table } from "sst/node/table";

export class ProfilesTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.tableName = tableName;
  }

  async store(profile: DbProfile) {
    console.log(`ProfilesTable: Storing profile for ${profile.userName}`);

    const putInput: PutItemInput = {
      TableName: this.tableName,
      Item: {
        userName: { S: profile.userName },
        bondReportsBrowserSettings: { S: profile.bondReportsBrowserSettings }
      }
    }

    await this.dynamoDBClient.send(new PutItemCommand(putInput));
  }

  async get(userName: string): Promise<DbProfile | undefined> {

    console.log(`ProfilesTable: Fetching profile for: ${userName}`);

    const getInput: GetItemInput = {
      TableName: Table.Profiles.tableName,
      Key: {
        userName: { S: userName }
      }
    }

    const result = await this.dynamoDBClient.send(new GetItemCommand(getInput));
    const item = result.Item;

    return item !== undefined ? {
      userName: item['userName']['S'] || '',
      bondReportsBrowserSettings: item['bondReportsBrowserSettings']['S'] || ''
    } : undefined;
  }
}
