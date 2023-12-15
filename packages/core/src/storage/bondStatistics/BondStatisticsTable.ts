import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue, DynamoDBClient, GetItemCommand, GetItemInput, PutItemCommand, PutItemInput, UpdateItemCommand, UpdateItemCommandInput } from "@aws-sdk/client-dynamodb";
import { BondQuote, DbBondStatistics } from ".";

export class BondStatisticsTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.tableName = tableName;
  }

  async store(bondStatistics: DbBondStatistics): Promise<void> {
    console.log(`BondStatisticsTable: Storing bond statistics for '${bondStatistics.name}#${bondStatistics.market}'`);

    const quote = bondStatistics.quotes[0];
    const dateKey = quote.date.toISOString().substring(0, 10);

    const putInput: PutItemInput = {
      TableName: this.tableName,
      Item: {
        name: { S: bondStatistics.name },
        market: { S: bondStatistics.market },
        'name#market': { S: `${bondStatistics.name}#${bondStatistics.market}` },
        year: { N: bondStatistics.year.toString() },
        month: { N: bondStatistics.month.toString() },
        'year#month': { S: `${bondStatistics.year}#${bondStatistics.month}` },
        'quotes': {
          M: {
            [dateKey]: {
              M: {
                ...(quote.date && { date: { N: quote.date.getTime().toString() } }),
                ...(quote.close && { close: { N: quote.close.toString() } }),
                ...(quote.transactions && { transactions: { N: quote.transactions.toString() } }),
                ...(quote.volume && { volume: { N: quote.volume.toString() } }),
                ...(quote.turnover && { turnover: { N: quote.turnover.toString() } })
              }
            }
          }
        }
      }
    }

    await this.dynamoDBClient.send(new PutItemCommand(putInput));
  }

  async updateQuotes(bondStatistics: DbBondStatistics): Promise<boolean> {
    console.log(`BondStatisticsTable: Updateing quote for '${bondStatistics.name}#${bondStatistics.market}'`);

    const quote = bondStatistics.quotes[0];
    const dateKey = quote.date.toISOString().substring(0, 10);

    const updateInput: UpdateItemCommandInput = {
      TableName: this.tableName,
      ExpressionAttributeNames: {
        "#QUOTES": "quotes",
        "#DATE": dateKey
      },
      ExpressionAttributeValues: {
        ":quote": {
          M: {
            ...(quote.date && { date: { N: quote.date.getTime().toString() } }),
            ...(quote.close && { close: { N: quote.close.toString() } }),
            ...(quote.transactions && { transactions: { N: quote.transactions.toString() } }),
            ...(quote.volume && { volume: { N: quote.volume.toString() } }),
            ...(quote.turnover && { turnover: { N: quote.turnover.toString() } })
          }
        }
      },
      Key: {
        'name#market': { S: `${bondStatistics.name}#${bondStatistics.market}` },
        'year#month': { S: `${bondStatistics.year}#${bondStatistics.month}` }
      },
      UpdateExpression: "SET #QUOTES.#DATE = :quote",
      ConditionExpression: "attribute_exists(#QUOTES)"
    };

    try {
      await this.dynamoDBClient.send(new UpdateItemCommand(updateInput));
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false;
      }
      else {
        throw error;
      }
    }
  }

  async get(bondId: string, year: number, month: number): Promise<DbBondStatistics | undefined> {
    console.log(`DbBondStatistics: Fetching statistics for: ${bondId}`);

    const getInput: GetItemInput = {
      TableName: this.tableName,
      Key: {
        'name#market': { S: `${bondId}` },
        'year#month': { S: `${year}#${month}` }
      }
    }

    const result = await this.dynamoDBClient.send(new GetItemCommand(getInput));
    const item = result.Item;

    return item !== undefined ? {
      name: item['name']['S'] || '',
      market: item['market']['S'] || '',
      year: Number(item['year']?.['N']),
      month: Number(item['month']?.['N']),
      quotes: this.unmarshallQuotes(item['quotes']?.['M']),
    } : undefined;
  }

  unmarshallQuotes(map: Record<string, AttributeValue> | undefined): BondQuote[] {
    if (map === undefined) {
      return [];
    }
    return Object.values(map)
      .map(quoteAttributeValue => quoteAttributeValue['M'])
      .filter((quoteObject): quoteObject is Record<string, AttributeValue> => !!quoteObject)
      .map(quoteAttributeValue => unmarshall(quoteAttributeValue) as BondQuote);
  }

}
