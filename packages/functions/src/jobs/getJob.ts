import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { Failure, lambdaHandler, Success } from '../HandlerProxy';
import { JobsTable } from '@core/storage/jobs';
import { GetJobResult } from '.';

const logger = new Logger({ serviceName: 'GetJob' });
const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<GetJobResult>(async event => {
  const jobId = decodeURIComponent(event.pathParameters?.jobId ?? '');
  if (!jobId) {
    return Failure('Not found', 404);
  }

  const jobsTable = new JobsTable(dynamoDBClient, Resource.Jobs.name);
  const job = await jobsTable.getByJobId(jobId);

  if (!job) {
    logger.info('Job not found', { jobId });
    return Failure('Not found', 404);
  }

  return Success(job);
});
