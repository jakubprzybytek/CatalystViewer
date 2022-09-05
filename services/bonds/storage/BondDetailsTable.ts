import { DynamoDBClient, PutItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DbBondDetails } from '.';

const BATCH_SIZE = 25;

export class BondDetailsTable {
  readonly dynamoDBClient: DynamoDBClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBClient = dynamoDBClient;
    this.tableName = tableName;
  }

  async storeAll(bonds: DbBondDetails[]) {
    console.log(`Storing ${bonds.length} DbBondDetails objects`);

    const bondsBatches: DbBondDetails[][] = [];
    for (let i = 0; i < bonds.length; i += BATCH_SIZE) {
      const batch = bonds.slice(i, i + BATCH_SIZE);
      bondsBatches.push(batch);
    }

    for (const bondsBatch of bondsBatches) {
      const batchWriteParams: BatchWriteItemCommandInput = {
        "RequestItems": {
          [this.tableName]: bondsBatch.map((bondDetails) => ({
            "PutRequest": {
              Item: {
                issuer: { S: bondDetails.issuer },
                'name#market': { S: `${bondDetails.name}#${bondDetails.market}` },
                name: { S: bondDetails.name },
                market: { S: bondDetails.market },
                type: { S: bondDetails.type },
                nominalValue: { N: bondDetails.nominalValue.toString() },
                maturityDay: { S: bondDetails.maturityDay.toISOString() },
                currentInterestRate: { N: (bondDetails.currentInterestRate || -1).toString() },
                accuredInterest: { N: bondDetails.accuredInterest.toString() }
              },
            }
          })),
        },
      }

      const result = await this.dynamoDBClient.send(new BatchWriteItemCommand(batchWriteParams));

      const errors = result.UnprocessedItems?.[this.tableName];
      console.log(`Saved ${bondsBatch.length} objects`);

      if (errors !== undefined) {
        console.log(`Errors: ${JSON.stringify(errors)}`);
        throw Error('Error during BatchWriteCommand: ' + errors);
      }
    }
  }

  async getAll(): Promise<DbBondDetails[]> {
    console.log('BondDetailsTable: Fetching all bonds');
    const queryCommand = new ScanCommand({
      TableName: this.tableName
    });

    const result = await this.dynamoDBClient.send(queryCommand);
    console.log(`BondDetailsTable: Returning ${result.Count ? result.Count : 0} bonds.`);

    return result.Items
      ? result.Items.map((item) => {
        return {
          issuer: item['issuer']['S'] || '',
          name: item['name']['S'] || '',
          market: item['market']['S'] || '',
          type: item['type']['S'] || '',
          nominalValue: Number(item['nominalValue']['N']) || -1,
          maturityDay: new Date(Date.parse(item['maturityDay']['S'] || '')),
          currentInterestRate: Number(item['currentInterestRate']['N']) || -1,
          accuredInterest: Number(item['accuredInterest']['N']) || -1,
        };
      })
      : [];
  }

  // async getAll(): Promise<DbBondDetails[]> {
  //   console.log('BondDetailsTable: Fetching all bonds');
  //   const queryCommand = new QueryCommand({
  //     TableName: this.tableName
  //   });

  //   const result = await this.dynamoDBClient.send(queryCommand);
  //   console.log(`BondDetailsTable: Returning ${result.Count ? result.Count : 0} bonds.`);

  //   return result.Items
  //     ? result.Items.map((item) => {
  //       return {
  //         issuer: item['issuer']['S'] || '',
  //         name: item['name']['S'] || '',
  //         market: item['market']['S'] || '',
  //         type: item['type']['S'] || '',
  //         nominalValue: Number(item['nominalValue']['N']) || -1,
  //         maturityDay: new Date(Date.parse(item['maturityDay']['S'] || '')),
  //         currentInterestRate: Number(item['currentInterestRate']['N']) || -1,
  //         accuredInterest: Number(item['accuredInterest']['N']) || -1,
  //       };
  //     })
  //     : [];
  // }
};
