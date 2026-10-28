import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gunzipSync } from 'zlib';

const listNewestMock = vi.fn();
const listNewestByStatusMock = vi.fn();

vi.mock('sst', () => ({
  Resource: {
    Jobs: { name: 'JobsTable' },
  },
}));

vi.mock('@core/storage/jobs', () => ({
  // a function, not an arrow: vitest 4 mocks called with `new` must be constructible
  JobsTable: vi.fn(function () {
    return {
      listNewest: listNewestMock,
      listNewestByStatus: listNewestByStatusMock,
    };
  }),
}));

import { apiEvent } from '../testEvents';
import { handler } from './getJobs';

function parseBody(response: { body: string; isBase64Encoded?: boolean }): unknown {
  if (response.isBase64Encoded) {
    return JSON.parse(gunzipSync(Buffer.from(response.body, 'base64')).toString('utf-8'));
  }
  return JSON.parse(response.body);
}

describe('getJobs handler', () => {
  beforeEach(() => {
    listNewestMock.mockReset();
    listNewestByStatusMock.mockReset();
  });

  it('rejects a user outside the accepted groups with 403', async () => {
    const response = await handler(apiEvent({ queryStringParameters: {} }, '[portfolio-tracker catalyst-viewer-test]'), {} as never, undefined as never) as { statusCode: number };

    expect(response.statusCode).toBe(403);
    expect(listNewestMock).not.toHaveBeenCalled();
  });

  it('returns newest jobs without filter', async () => {
    listNewestMock.mockResolvedValue({ jobs: [{ jobId: '1' }], nextCursor: { listSk: 123 } });

    const response = await handler(apiEvent({ queryStringParameters: {} }), {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(200);
    expect(parseBody(response as never)).toEqual({ jobs: [{ jobId: '1' }], nextCursor: '123' });
    expect(listNewestMock).toHaveBeenCalledWith(20, undefined);
  });

  it('validates unsupported statuses', async () => {
    const response = await handler(apiEvent({ queryStringParameters: { statuses: 'BAD' } }), {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(400);
    expect(parseBody(response as never)).toEqual({ message: 'Unsupported statuses: BAD' });
  });

  it('queries status-specific list for single status', async () => {
    listNewestByStatusMock.mockResolvedValue({ jobs: [{ jobId: '2' }], nextCursor: undefined });

    const response = await handler(apiEvent({ queryStringParameters: { statuses: 'FAILED', limit: '10' } }), {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(200);
    expect(parseBody(response as never)).toEqual({ jobs: [{ jobId: '2' }] });
    expect(listNewestByStatusMock).toHaveBeenCalledWith('FAILED', 10, undefined);
  });
});
