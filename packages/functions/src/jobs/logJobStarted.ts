import { randomUUID } from 'crypto';
import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { buildAnalysisInputSummary, buildBondsInputSummary } from '@core/jobs';
import { JobsTable, JobWorkflowType } from '@core/storage/jobs';

const logger = new Logger({ serviceName: 'LogJobStarted' });
const dynamoDBClient = new DynamoDBClient({});

type LogJobStartedInput = {
  workflowType: JobWorkflowType;
  executionArn: string;
  startedAt?: string;
  input?: Record<string, unknown>;
};

type LogJobStartedResult = {
  logged: boolean;
  jobId?: string;
};

export async function handler(input: LogJobStartedInput, context: Context): Promise<LogJobStartedResult> {
  logger.addContext(context);

  try {
    const workflowType = input.workflowType;
    const executionArn = input.executionArn;
    const startedAtDate = input.startedAt ? new Date(input.startedAt) : new Date();
    const startedAt = Number.isNaN(startedAtDate.getTime()) ? new Date() : startedAtDate;

    const inputSummary = workflowType === 'BONDS_UPDATER'
      ? buildBondsInputSummary(input.input ?? {})
      : buildAnalysisInputSummary({
        issuers: input.input?.['issuers'] as string[] | undefined,
        count: input.input?.['count'] as number | undefined,
      });

    const jobsTable = new JobsTable(dynamoDBClient, Resource.Jobs.name);
    const jobId = randomUUID();

    await jobsTable.putStarted({
      jobId,
      executionArn,
      workflowType,
      startedAt: startedAt.toISOString(),
      startedAtTs: startedAt.getTime(),
      inputSummary,
    });

    logger.info('Job start persisted', { workflowType, executionArn, jobId });
    return { logged: true, jobId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Failed to persist job start', { reason, workflowType: input.workflowType, executionArn: input.executionArn });
    return { logged: false };
  }
}
