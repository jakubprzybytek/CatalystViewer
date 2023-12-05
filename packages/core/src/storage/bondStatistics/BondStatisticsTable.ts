import { DynamoDBClient, GetItemCommand, GetItemInput, PutItemCommand, PutItemInput, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { DbBondStatistics } from ".";
import { Table } from "sst/node/table";

export class BondStatisticsTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.tableName = tableName;
  }

  async store(bondStatistics: DbBondStatistics): Promise<void> {
    console.log(`BondStatisticsTable: Storing bond statistics for ${bondStatistics.name} | ${bondStatistics.market}`);

    const putInput: PutItemInput = {
      TableName: this.tableName,
      Item: {
        name: { S: bondStatistics.name },
        market: { S: bondStatistics.market },
        'name#market': { S: `${bondStatistics.name}#${bondStatistics.market}` },
        year: { N: bondStatistics.year.toString() },
        month: { N: bondStatistics.month.toString() },
        'year#month': { S: `${bondStatistics.year}#${bondStatistics.month}` },
        'quotes': { M: { "abc": { "S": "123" } } }
      }
    }

    await this.dynamoDBClient.send(new PutItemCommand(putInput));
  }

  async updateQuote(bondStatistics: DbBondStatistics): Promise<void> {
    console.log(`BondStatisticsTable: Updateing quote for '${bondStatistics.name}#${bondStatistics.market}'`);

    const updateInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      ExpressionAttributeNames: {
        "#Q": "quotes",
        "#DATE": "2023.12.05"
      },
      ExpressionAttributeValues: {
        ":q": {
          S: "kek"
        }
      },
      Key: {
        'name#market': { S: `${bondStatistics.name}#${bondStatistics.market}` },
        'year#month': { S: `${bondStatistics.year}#${bondStatistics.month}` }
      },
      UpdateExpression: "SET #Q.#DATE = :q"
    };

    await this.dynamoDBClient.send(new UpdateItemCommand(updateInput));
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
