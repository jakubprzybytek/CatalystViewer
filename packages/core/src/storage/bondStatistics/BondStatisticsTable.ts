import { DynamoDBClient, GetItemCommand, GetItemInput, PutItemCommand, PutItemInput } from "@aws-sdk/client-dynamodb";
import { DbBondStatistics } from ".";
import { Table } from "sst/node/table";

export class BondStatisticsTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.tableName = tableName;
  }

  async store(bondStatistics: DbBondStatistics) {
    console.log(`BondStatisticsTable: Storing bond statistics for ${bondStatistics.name} | ${bondStatistics.market}`);

    const putInput: PutItemInput = {
      TableName: this.tableName,
      Item: {
        name: { S: bondStatistics.name },
        market: { S: bondStatistics.market }
      }
    }

    await this.dynamoDBClient.send(new PutItemCommand(putInput));
  }

  async get(name: string, market: string, year: number, month: number): Promise<DbBondStatistics | undefined> {

    console.log(`DbBondStatistics: Fetching statistics for: ${name} | ${name}`);

    const getInput: GetItemInput = {
      TableName: Table.Profiles.tableName,
      Key: {
        'name#market': { S: `${name}#${market}` }
      }
    }

    const result = await this.dynamoDBClient.send(new GetItemCommand(getInput));
    const item = result.Item;

    return item !== undefined ? {
      name: item['name']['S'] || '',
      market: item['market']['S'] || '',
      year: Number(item['year']?.['N']) || 0,
      month: Number(item['month']?.['N']) || 0,
      quotes: item['quotes']['S'] || '',
    } : undefined;
  }
}
