import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { BondQuote, DbBondStatistics } from ".";

export class BondStatisticsTable {
  readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: { removeUndefinedValues: true }
    });
    this.tableName = tableName;
  }

  async store(bondStatistics: DbBondStatistics): Promise<void> {
    console.log(`BondStatisticsTable: Storing bond statistics for '${bondStatistics.name}#${bondStatistics.market}'`);

    const quote = bondStatistics.quotes[0];
    const dateKey = new Date(quote.date).toISOString().substring(0, 10);

    await this.dynamoDBDocumentClient.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        name: bondStatistics.name,
        market: bondStatistics.market,
        'name#market': `${bondStatistics.name}#${bondStatistics.market}`,
        year: bondStatistics.year,
        month: bondStatistics.month,
        'year#month': `${bondStatistics.year}#${bondStatistics.month}`,
        quotes: { [dateKey]: quote }
      }
    }));
  }

  async updateQuotes(bondStatistics: DbBondStatistics): Promise<boolean> {
    console.log(`BondStatisticsTable: Updating quote for '${bondStatistics.name}#${bondStatistics.market}'`);

    const quote = bondStatistics.quotes[0];
    const dateKey = new Date(quote.date).toISOString().substring(0, 10);

    try {
      await this.dynamoDBDocumentClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          'name#market': `${bondStatistics.name}#${bondStatistics.market}`,
          'year#month': `${bondStatistics.year}#${bondStatistics.month}`
        },
        ExpressionAttributeNames: {
          "#QUOTES": "quotes",
          "#DATE": dateKey
        },
        ExpressionAttributeValues: {
          ":quote": quote
        },
        UpdateExpression: "SET #QUOTES.#DATE = :quote",
        ConditionExpression: "attribute_exists(#QUOTES)"
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false;
      }
      throw error;
    }
  }

  async get(bondId: string, year: number, month: number): Promise<DbBondStatistics | undefined> {
    console.log(`DbBondStatistics: Fetching statistics for: ${bondId} | ${year}-${month}`);

    const result = await this.dynamoDBDocumentClient.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        'name#market': bondId,
        'year#month': `${year}#${month}`
      }
    }));

    const item = result.Item;
    return item ? {
      name: item.name,
      market: item.market,
      year: item.year,
      month: item.month,
      quotes: Object.values(item.quotes) as BondQuote[]
    } : undefined;
  }

}
