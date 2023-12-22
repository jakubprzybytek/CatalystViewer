import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { sub } from 'date-fns';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { BondQuotesQueryResult } from ".";
import { BondStatisticsTable, BondQuotesQuery } from '@catalyst-viewer/core/storage/bondStatistics';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondQuotesQueryResult>(async event => {
  const bondName = event.queryStringParameters?.['bond'];
  if (bondName === undefined) {
    return Failure("Mandatory parameter is missing: 'bond'");
  }

  const market = event.queryStringParameters?.['market'];
  if (market === undefined) {
    return Failure("Mandatory parameter is missing: 'market'");
  }

  const bondId = `${bondName}#${market}`;

  console.log(`Received request for statistics for: ${bondId}`);

  const bondStatisticsTable = new BondStatisticsTable(dynamoDBClient, Table.BondStatistics.tableName);
  const bondQuotesQuery = new BondQuotesQuery(bondStatisticsTable);

  const endDate = new Date(new Date().setHours(23, 59, 59, 999));
  const startDate = new Date(sub(endDate, { days: 30 }).setHours(0, 0, 0, 0));

  console.log(`Time range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

  const quotes = await bondQuotesQuery.get(bondName, market, startDate, endDate);

  return Success(quotes);
});
