import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gunzipSync } from 'zlib';

const getByJobIdMock = vi.fn();

vi.mock('sst', () => ({
  Resource: {
    Jobs: { name: 'JobsTable' },
  },
}));

vi.mock('@core/storage/jobs', () => ({
  JobsTable: vi.fn().mockImplementation(() => ({
    getByJobId: getByJobIdMock,
  })),
}));

import { handler } from './getJob';

function parseBody(response: { body: string; isBase64Encoded?: boolean }): unknown {
  if (response.isBase64Encoded) {
    return JSON.parse(gunzipSync(Buffer.from(response.body, 'base64')).toString('utf-8'));
  }
  return JSON.parse(response.body);
}

describe('getJob handler', () => {
  beforeEach(() => {
    getByJobIdMock.mockReset();
  });

  it('returns 404 for missing job id', async () => {
    const response = await handler({ pathParameters: {} } as never, {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(404);
    expect(parseBody(response as never)).toEqual({ message: 'Not found' });
  });

  it('returns 404 when job is not found', async () => {
    getByJobIdMock.mockResolvedValue(undefined);

    const response = await handler({ pathParameters: { jobId: 'j-1' } } as never, {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(404);
    expect(parseBody(response as never)).toEqual({ message: 'Not found' });
    expect(getByJobIdMock).toHaveBeenCalledWith('j-1');
  });

  it('returns job details when found', async () => {
    getByJobIdMock.mockResolvedValue({ jobId: 'j-2', status: 'SUCCEEDED' });

    const response = await handler({ pathParameters: { jobId: 'j-2' } } as never, {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(200);
    expect(parseBody(response as never)).toEqual({ jobId: 'j-2', status: 'SUCCEEDED' });
  });
});
