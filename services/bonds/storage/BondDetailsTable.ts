import { DynamoDBClient, PutItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { DbBondDetails } from '.';

const BATCH_SIZE = 25;

export class BondDetailsTable {
  readonly dynamoDBClient: DynamoDBClient;

  constructor(dynamoDBClient: DynamoDBClient) {
    this.dynamoDBClient = dynamoDBClient;
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
          'int-catalyst-viewer-BondDetails': bondsBatch.map((bondDetails) => ({
            "PutRequest": {
              Item: {
                issuer: { S: bondDetails.issuer },
                'name#market': { S: `${bondDetails.name}#${bondDetails.market}` },
                name: { S: bondDetails.name },
                market: { S: bondDetails.market },
              },
            }
          })),
        },
      }
      const result = await this.dynamoDBClient.send(new BatchWriteItemCommand(batchWriteParams));
      const errors = result.UnprocessedItems?.['int-catalyst-viewer-BondDetails']; 
      console.log(`Saved ${bondsBatch.length} objects`);
      
      if (errors !== undefined) {
        console.log(`Errors: ${JSON.stringify(errors)}`);
        throw Error('Error during BatchWriteCommand: ' + errors);
      }
    }
  }
};
