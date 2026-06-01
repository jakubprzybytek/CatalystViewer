import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { Failure, lambdaHandler, Success } from '../HandlerProxy';
import { JobsTable, JobStatus } from '@core/storage/jobs';
import { GetJobsResult } from '.';

const logger = new Logger({ serviceName: 'GetJobs' });
const dynamoDBClient = new DynamoDBClient({});

const SUPPORTED_STATUSES: JobStatus[] = ['RUNNING', 'SUCCEEDED', 'FAILED', 'TIMED_OUT'];

function parseStatuses(value: string | undefined): JobStatus[] {
  if (!value) {
    return [];
  }

  const statuses = value.split(',').map(s => s.trim()).filter(Boolean) as JobStatus[];
  const invalid = statuses.filter(status => !SUPPORTED_STATUSES.includes(status));
  if (invalid.length > 0) {
    throw new Error(`Unsupported statuses: ${invalid.join(', ')}`);
  }

  return [...new Set(statuses)];
}

function parseLimit(value: string | undefined): number {
  if (!value) {
    return 20;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Invalid limit');
  }

  return Math.min(Math.floor(parsed), 100);
}

function parseCursor(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid cursor');
  }

  return parsed;
}

export const handler = lambdaHandler<GetJobsResult>(async event => {
  try {
    const statuses = parseStatuses(event.queryStringParameters?.['statuses']);
    const limit = parseLimit(event.queryStringParameters?.['limit']);
    const cursor = parseCursor(event.queryStringParameters?.['cursor']);

    logger.info('Getting jobs', { statuses, limit, cursor });

    const jobsTable = new JobsTable(dynamoDBClient, Resource.Jobs.name);

    if (statuses.length > 1) {
      const merged: GetJobsResult['jobs'] = [];
      for (const status of statuses) {
        const result = await jobsTable.listNewestByStatus(status, limit);
        merged.push(...result.jobs);
      }

      merged.sort((a, b) => b.startedAtTs - a.startedAtTs);
      const jobs = merged.slice(0, limit);
      return Success({ jobs });
    }

    const result = statuses.length === 1
      ? await jobsTable.listNewestByStatus(statuses[0], limit, cursor ? { listSk: cursor } : undefined)
      : await jobsTable.listNewest(limit, cursor ? { listSk: cursor } : undefined);

    return Success({
      jobs: result.jobs,
      nextCursor: result.nextCursor?.listSk?.toString(),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn('Invalid jobs query', { reason });
    return Failure(reason, 400);
  }
});
