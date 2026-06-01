import { get } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { GetJobResult, GetJobsResult, JobStatus } from '@catalyst-viewer/functions/jobs';

export type { GetJobResult, GetJobsResult, JobStatus };

type GetJobsParams = {
  statuses?: JobStatus[];
  cursor?: string;
  limit?: number;
};

export async function getJobs(params: GetJobsParams = {}): Promise<GetJobsResult> {
  const query = new URLSearchParams();
  if (params.statuses && params.statuses.length > 0) {
    query.set('statuses', params.statuses.join(','));
  }
  if (params.cursor) {
    query.set('cursor', params.cursor);
  }
  if (params.limit !== undefined) {
    query.set('limit', params.limit.toString());
  }

  const path = `/api/jobs${query.toString() ? `?${query.toString()}` : ''}`;
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;

  return (await response.body.json()) as unknown as GetJobsResult;
}

export async function getJob(jobId: string): Promise<GetJobResult> {
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path: `/api/jobs/${encodeURIComponent(jobId)}`,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;

  return (await response.body.json()) as unknown as GetJobResult;
}
