import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { lambdaHandler, Success } from "../HandlerProxy";
import { BondStatisticsQueryResult } from ".";
import { BondStatisticsTable, DbBondStatistics } from '@catalyst-viewer/core/storage/bondStatistics';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondStatisticsQueryResult>(async event => {

  const bondStatisticsTable = new BondStatisticsTable(dynamoDBClient, Table.BondStatistics.tableName);

  const dbBondStatistics: DbBondStatistics = {
    name: 'git',
    market: 'GPW RR',
    year: 2023,
    month: 12,
    quotes: ''
  }

  await bondStatisticsTable.store(dbBondStatistics);

  await bondStatisticsTable.updateQuote(dbBondStatistics);

  return Success({
    hello: 'world'
  });
});
