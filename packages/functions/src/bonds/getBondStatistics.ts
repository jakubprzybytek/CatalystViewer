import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { BondStatisticsQueryResult } from ".";
import { BondStatisticsTable, DbBondStatistics } from '@catalyst-viewer/core/storage/bondStatistics';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondStatisticsQueryResult>(async event => {
  const bondIdsParamString = event.queryStringParameters?.['bonds'];

  if (bondIdsParamString === undefined) {
    return Failure("Missing parameter: 'bonds'");
  }

  const bondIds = bondIdsParamString.split(',');

  const bondStatisticsTable = new BondStatisticsTable(dynamoDBClient, Table.BondStatistics.tableName);

  const bondStatisticsList: DbBondStatistics[] = [];
  for (const bondId of bondIds) {
    const bondStatistics = await bondStatisticsTable.get(bondId, 2023, 12);
    if (bondStatistics) {
      bondStatisticsList.push(bondStatistics);
    }
  }

  return Success(bondStatisticsList);
});
