import * as R from 'ramda';
import { DynamoDBClient, BatchWriteItemCommandInput, BatchWriteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DbBondDetails } from '.';
import { scanAll } from './utils';

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
          [this.tableName]: bondsBatch.map(dbBondDetails => ({
            "PutRequest": {
              Item: {
                bondType: { S: dbBondDetails.type },
                bondStatus: { S: dbBondDetails.status },
                updatedTs: { N: dbBondDetails.updatedTs.toString() },
                issuer: { S: dbBondDetails.issuer },
                'name#market': { S: `${dbBondDetails.name}#${dbBondDetails.market}` },
                name: { S: dbBondDetails.name },
                isin: { S: dbBondDetails.isin },
                market: { S: dbBondDetails.market },
                nominalValue: { N: dbBondDetails.nominalValue.toString() },
                issueValue: { N: dbBondDetails.issueValue.toString() },
                currency: { S: dbBondDetails.currency },
                maturityDay: { S: dbBondDetails.maturityDay.toISOString().substring(0, 10) },
                maturityDayTs: { N: dbBondDetails.maturityDayTs.toString() },
                interestType: { S: dbBondDetails.interestType },
                ...(dbBondDetails.interestVariable && { interestVariable: { S: dbBondDetails.interestVariable } }),
                interestConst: { N: dbBondDetails.interestConst.toString() },
                interestFirstDays: { SS: dbBondDetails.interestFirstDays },
                ...(dbBondDetails.interestFirstDayTss.length > 0 && { interestFirstDayTss: { SS: dbBondDetails.interestFirstDayTss.map((number) => number.toString()) } }),
                ...(dbBondDetails.interestRightsDays.length > 0 && { interestRightsDay: { SS: dbBondDetails.interestRightsDays } }),
                ...(dbBondDetails.interestRightsDayTss.length > 0 && { interestRightsDayTss: { SS: dbBondDetails.interestRightsDayTss.map((number) => number.toString()) } }),
                interestPayoffDays: { SS: dbBondDetails.interestPayoffDays },
                ...(dbBondDetails.interestPayoffDayTss.length > 0 && { interestPayoffDayTss: { SS: dbBondDetails.interestPayoffDayTss.map((number) => number.toString()) } }),

                currentInterestRate: { N: (dbBondDetails.currentInterestRate || -1).toString() },
                accuredInterest: { N: dbBondDetails.accuredInterest.toString() },
                ...(dbBondDetails.referencePrice && { referencePrice: { N: dbBondDetails.referencePrice.toString() } }),
                ...(dbBondDetails.lastDateTime && { lastDateTime: { S: dbBondDetails.lastDateTime } }),
                ...(dbBondDetails.lastPrice && { lastPrice: { N: dbBondDetails.lastPrice.toString() } }),
                ...(dbBondDetails.bidCount && { bidCount: { N: dbBondDetails.bidCount.toString() } }),
                ...(dbBondDetails.bidVolume && { bidVolume: { N: dbBondDetails.bidVolume.toString() } }),
                ...(dbBondDetails.bidPrice && { bidPrice: { N: dbBondDetails.bidPrice.toString() } }),
                ...(dbBondDetails.askPrice && { askPrice: { N: dbBondDetails.askPrice.toString() } }),
                ...(dbBondDetails.askVolume && { askVolume: { N: dbBondDetails.askVolume.toString() } }),
                ...(dbBondDetails.askCount && { askCount: { N: dbBondDetails.askCount.toString() } }),
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

    return result.Items ? result.Items.map(item => ({
      type: item['bondType']['S'] || '',
      status: item['bondStatus']?.['S'] || 'inactive',
      updatedTs: Number(item['updatedTs']?.['N']) || 0,
      issuer: item['issuer']['S'] || '',
      name: item['name']['S'] || '',
      isin: item['isin']['S'] || '',
      market: item['market']['S'] || '',
      nominalValue: Number(item['nominalValue']['N']) || -1,
      issueValue: Number(item['issueValue']?.['N']) || -1,
      currency: item['currency']?.['S'] || '',
      maturityDay: new Date(Date.parse(item['maturityDay']['S'] || '')),
      maturityDayTs: Number(item['maturityDayTs']?.['N']) || 0,
      interestType: item['interestType']['S'] || '',
      interestVariable: item['interestVariable']?.['S'],
      interestConst: Number(item['interestConst']?.['N']) || 0,
      interestFirstDays: item['interestFirstDays']?.['SS'] || [],
      interestFirstDayTss: item['interestFirstDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],
      interestRightsDays: item['interestRightsDays']?.['SS'] || [],
      interestRightsDayTss: item['interestRightsDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],
      interestPayoffDays: item['interestPayoffDays']?.['SS'] || [],
      interestPayoffDayTss: item['interestPayoffDayTss']?.['SS']?.map((str) => Number.parseInt(str)) || [],

      currentInterestRate: Number(item['currentInterestRate']['N']) || 0,
      accuredInterest: Number(item['accuredInterest']['N']) || 0,
      ...(item['referencePrice']?.['N'] && { referencePrice: Number(item['referencePrice']?.['N']) }),
      ...(item['lastDateTime']?.['S'] && { lastDateTime: item['lastDateTime']?.['S'] }),
      ...(item['lastPrice']?.['N'] && { lastPrice: Number(item['lastPrice']?.['N']) }),
      ...(item['bidCount']?.['N'] && { bidCount: Number(item['bidCount']?.['N']) }),
      ...(item['bidVolume']?.['N'] && { bidVolume: Number(item['bidVolume']?.['N']) }),
      ...(item['bidPrice']?.['N'] && { bidPrice: Number(item['bidPrice']?.['N']) }),
      ...(item['askPrice']?.['N'] && { askPrice: Number(item['askPrice']?.['N']) }),
      ...(item['askVolume']?.['N'] && { askVolume: Number(item['askVolume']?.['N']) }),
      ...(item['askCount']?.['N'] && { askCount: Number(item['askCount']?.['N']) }),
    }))
      : [];
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