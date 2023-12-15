import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { BondStatisticsQueryResult } from ".";
import { DbBondStatistics, BondStatisticsTable, BondQuotesQuery } from '@catalyst-viewer/core/storage/bondStatistics';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondStatisticsQueryResult>(async event => {
  const bondIdsParamString = event.queryStringParameters?.['bonds'];

  if (bondIdsParamString === undefined) {
    return Failure("Missing parameter: 'bonds'");
  }

  const bondIds = bondIdsParamString.split(',');

  console.log(`Received request for statistics of: ${bondIds}`);

  const bondStatisticsTable = new BondStatisticsTable(dynamoDBClient, Table.BondStatistics.tableName);

  const bondStatisticsList: DbBondStatistics[] = [];
  for (const bondId of bondIds) {
    const bondStatistics = await bondStatisticsTable.get(bondId, 2023, 12);
    if (bondStatistics) {
      bondStatisticsList.push(bondStatistics);
    }
  }

  const bondQuotesQuery = new BondQuotesQuery(bondStatisticsTable);
  const quotes = await bondQuotesQuery.get('FPC0427', 'GPW RR', new Date('2023-12-04'), new Date('2023-12-15 23:59:59.999'));

  console.log(quotes);

  return Success(bondStatisticsList);
});
