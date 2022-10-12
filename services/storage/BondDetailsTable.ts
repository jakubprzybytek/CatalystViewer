import { DynamoDBClient, BatchWriteItemCommandInput, BatchWriteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
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
          [this.tableName]: bondsBatch.map((dbBondDetails) => ({
            "PutRequest": {
              Item: {
                bondStatus: { S: dbBondDetails.status },
                updated: { S: dbBondDetails.updated },
                issuer: { S: dbBondDetails.issuer },
                'name#market': { S: `${dbBondDetails.name}#${dbBondDetails.market}` },
                name: { S: dbBondDetails.name },
                isin: { S: dbBondDetails.isin },
                market: { S: dbBondDetails.market },
                type: { S: dbBondDetails.type },
                nominalValue: { N: dbBondDetails.nominalValue.toString() },
                currency: { S: dbBondDetails.currency },
                maturityDay: { S: dbBondDetails.maturityDay.toISOString().substring(0, 10) },
                interestType: { S: dbBondDetails.interestType },
                ...(dbBondDetails.interestVariable && { interestVariable: { S: dbBondDetails.interestVariable } }),
                interestConst: { N: dbBondDetails.interestConst.toString() },
                currentInterestRate: { N: (dbBondDetails.currentInterestRate || -1).toString() },
                accuredInterest: { N: dbBondDetails.accuredInterest.toString() },
                closingPrice: { N: dbBondDetails.closingPrice.toString() },
                interestFirstDays: { SS: dbBondDetails.interestFirstDays },
                interestPayoffDays: { SS: dbBondDetails.interestPayoffDays }
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
    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'bondStatus = :bs',
      ExpressionAttributeValues: {
        ":bs": { S: "active" }
      }
    });

    const result = await this.dynamoDBClient.send(scanCommand);
    console.log(`BondDetailsTable: Returning ${result.Count ? result.Count : 0} bonds.`);

    return result.Items
      ? result.Items.map((item) => {
        return {
          status: item['bondStatus']?.['S'] || 'inactive',
          updated: item['updated']?.['S'] || 'n/a',
          issuer: item['issuer']['S'] || '',
          name: item['name']['S'] || '',
          isin: item['isin']['S'] || '',
          market: item['market']['S'] || '',
          type: item['type']['S'] || '',
          nominalValue: Number(item['nominalValue']['N']) || -1,
          currency: item['currency']?.['S'] || '',
          maturityDay: new Date(Date.parse(item['maturityDay']['S'] || '')),
          interestType: item['interestType']['S'] || '',
          interestVariable: item['interestVariable']?.['S'],
          interestConst: Number(item['interestConst']?.['N']) || 0,
          currentInterestRate: Number(item['currentInterestRate']['N']) || -1,
          accuredInterest: Number(item['accuredInterest']['N']) || -1,
          closingPrice: Number(item['closingPrice']['N']) || -1,
          interestFirstDays: item['interestFirstDays']?.['SS'] || [],
          interestPayoffDays: item['interestPayoffDays']?.['SS'] || []
        };
      })
      : [];
  }

};