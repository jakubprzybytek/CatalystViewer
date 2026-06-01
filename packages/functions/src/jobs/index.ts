import { DbJobRecord, JobStatus, JobWorkflowType } from '@core/storage/jobs';

export type { DbJobRecord, JobStatus, JobWorkflowType };

export type GetJobsQuery = {
  statuses?: JobStatus[];
  limit?: number;
  cursor?: string;
};

export type GetJobsResult = {
  jobs: DbJobRecord[];
  nextCursor?: string;
};

export type GetJobResult = DbJobRecord;
