export * from './JobsTable';

export type JobWorkflowType = 'BONDS_UPDATER' | 'FUNDAMENTAL_ANALYSIS';

export type JobStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT';

export type DbJobErrorSummary = {
  stage?: string;
  errorType?: string;
  message?: string;
};

export type DbJobRecord = {
  // Primary list keys
  listPk: 'JOB';
  listSk: number;

  // Secondary index keys
  statusPk: `STATUS#${JobStatus}`;
  jobId: string;
  executionArn: string;

  // Record identity and metadata
  workflowType: JobWorkflowType;
  status: JobStatus;
  startedAt: string;
  startedAtTs: number;
  endedAt?: string;
  endedAtTs?: number;
  durationMs?: number;

  // Compact UI-facing summaries
  inputSummary: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorSummary?: DbJobErrorSummary;
};

export type JobsPageCursor = {
  listSk: number;
};

export type JobsPageResult = {
  jobs: DbJobRecord[];
  nextCursor?: JobsPageCursor;
};
