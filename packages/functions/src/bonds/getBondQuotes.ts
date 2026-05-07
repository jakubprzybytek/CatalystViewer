import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { sub } from 'date-fns';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { BondQuotesQueryResult } from ".";
import { BondStatisticsTable, BondQuotesQuery } from '@core/storage/bondStatistics';

const logger = new Logger({ serviceName: 'GetBondQuotes' });

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

  logger.info('Received request for bond quotes', { bond: bondName, market });

  const bondStatisticsTable = new BondStatisticsTable(dynamoDBClient, Resource.BondStatistics.name);
  const bondQuotesQuery = new BondQuotesQuery(bondStatisticsTable);

  const endDate = new Date(new Date().setHours(23, 59, 59, 999));
  const startDate = new Date(sub(endDate, { days: 30 }).setHours(0, 0, 0, 0));

  logger.info('Querying bond quotes', { start: startDate.toISOString(), end: endDate.toISOString() });

  const quotes = await bondQuotesQuery.get(bondName, market, startDate, endDate);

  return Success(quotes);
});
