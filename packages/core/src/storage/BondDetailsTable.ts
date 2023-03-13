import * as R from 'ramda';
import { DynamoDBClient, BatchWriteItemCommandInput, BatchWriteItemCommand, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { DbBondDetails } from '.';
import { queryAll, scanAll } from './utils';
import { DbBondDetailsToPutRequest, ItemToDbBondDetails } from './BondDetailsTableMapper';

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
          [this.tableName]: bondsBatch.map(DbBondDetailsToPutRequest),
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

  async getAllActive(): Promise<DbBondDetails[]> {

    console.log('BondDetailsTable: Fetching all active bonds');

    const startTimestamp = new Date().getTime();

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'bondStatus = :bs',
      ExpressionAttributeValues: {
        ":bs": { S: "active" }
      }
    });

    const result = await scanAll(this.dynamoDBClient, scanCommand);
    const endTimestamp = new Date().getTime();
    console.log(`BondDetailsTable: Returning ${result.Count ? result.Count : 0} bonds in ${endTimestamp - startTimestamp} ms.`);

    return result.Items ? result.Items.map(ItemToDbBondDetails) : [];
  }

  async getActive(bondType: string): Promise<DbBondDetails[]> {

    console.log(`BondDetailsTable: Fetching active bonds with type: ${bondType}`);

    const startTimestamp = new Date().getTime();

    const queryCommand = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'bondType = :bt',
      FilterExpression: 'bondStatus = :bs',
      ExpressionAttributeValues: {
        ':bs': { S: "active" },
        ':bt': { S: bondType }
      }
    });

    const result = await queryAll(this.dynamoDBClient, queryCommand);
    const endTimestamp = new Date().getTime();
    console.log(`BondDetailsTable: Returning ${result.Count ? result.Count : 0} bonds in ${endTimestamp - startTimestamp} ms.`);

    return result.Items ? result.Items.map(ItemToDbBondDetails) : [];
  }

  async getAllTypes(): Promise<string[]> {

    console.log('BondDetailsTable: Fetching all bonds types');

    const startTimestamp = new Date().getTime();

    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'bondStatus = :bs',
      ExpressionAttributeValues: {
        ":bs": { S: "active" }
      },
      ProjectionExpression: 'bondType'
    });

    const result = await scanAll(this.dynamoDBClient, scanCommand);
    const endTimestamp = new Date().getTime();

    const allBondTypes = result.Items ? result.Items.map(item => item['bondType']['S'] || '') : [];
    const uniqueBondTypes = R.uniq(allBondTypes);

    console.log(`BondDetailsTable: Returning ${uniqueBondTypes.length} bond types in ${endTimestamp - startTimestamp} ms.`);

    return uniqueBondTypes;
  }
};
