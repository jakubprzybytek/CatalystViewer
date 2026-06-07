import { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { buildAnalysisOutputSummary, buildBondsOutputSummary, buildErrorSummary } from '@core/jobs';
import { JobsTable, JobStatus, JobWorkflowType } from '@core/storage/jobs';

const logger = new Logger({ serviceName: 'LogJobCompleted' });
const dynamoDBClient = new DynamoDBClient({});

type LogJobCompletedInput = {
  workflowType: JobWorkflowType;
  executionArn: string;
  status: Exclude<JobStatus, 'RUNNING'>;
  output?: unknown;
  error?: unknown;
  stage?: string;
};

type LogJobCompletedResult = {
  logged: boolean;
};

function isTerminalStatus(value: string): value is Exclude<JobStatus, 'RUNNING'> {
  return value === 'SUCCEEDED' || value === 'FAILED' || value === 'TIMED_OUT';
}

export async function handler(input: LogJobCompletedInput, context: Context): Promise<LogJobCompletedResult> {
  logger.addContext(context);

  try {
    if (!isTerminalStatus(input.status)) {
      logger.warn('Skipping job completion log due to invalid status', { status: input.status });
      return { logged: false };
    }

    const jobsTable = new JobsTable(dynamoDBClient, Resource.Jobs.name);
    const existing = await jobsTable.getByExecutionArn(input.executionArn);

    if (!existing) {
      logger.warn('Skipping job completion log because start record is missing', { executionArn: input.executionArn });
      return { logged: false };
    }

    const now = new Date();
    const outputSummary = input.status === 'SUCCEEDED'
      ? input.workflowType === 'BONDS_UPDATER'
        ? buildBondsOutputSummary((input.output ?? {}) as Record<string, unknown>)
        : buildAnalysisOutputSummary((input.output as { analysedIssuers?: Array<{ success: boolean }> })?.analysedIssuers ?? [])
      : undefined;

    const errorSummary = input.status === 'SUCCEEDED'
      ? undefined
      : buildErrorSummary(input.error, input.stage);

    await jobsTable.markCompleted({
      jobId: existing.jobId,
      status: input.status,
      endedAt: now.toISOString(),
      endedAtTs: now.getTime(),
      durationMs: Math.max(0, now.getTime() - existing.startedAtTs),
      outputSummary,
      errorSummary,
    });

    logger.info('Job completion persisted', {
      workflowType: input.workflowType,
      executionArn: input.executionArn,
      jobId: existing.jobId,
      status: input.status,
    });

    return { logged: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    logger.error('Failed to persist job completion', { reason, workflowType: input.workflowType, executionArn: input.executionArn, status: input.status });
    return { logged: false };
  }
}
