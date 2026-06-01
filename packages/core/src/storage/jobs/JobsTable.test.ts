import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMock = vi.fn();
const fromMock = vi.fn(() => ({ send: sendMock }));

vi.mock('@aws-sdk/lib-dynamodb', () => {
  class PutCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class QueryCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  class UpdateCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    DynamoDBDocumentClient: { from: fromMock },
    PutCommand,
    QueryCommand,
    UpdateCommand,
  };
});

import { JobsTable } from './JobsTable';

describe('JobsTable', () => {
  beforeEach(() => {
    sendMock.mockReset();
    fromMock.mockClear();
  });

  it('stores started job', async () => {
    const table = new JobsTable({} as never, 'JobsTable');

    await table.putStarted({
      jobId: 'job-1',
      executionArn: 'arn:aws:states:xx:yy:execution:sm:job-1',
      workflowType: 'BONDS_UPDATER',
      startedAt: '2026-06-01T10:00:00.000Z',
      startedAtTs: 123,
      inputSummary: { updateBonds: true },
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const putInput = sendMock.mock.calls[0][0].input as { Item: Record<string, unknown>; TableName: string };
    expect(putInput.TableName).toBe('JobsTable');
    expect(putInput.Item.jobId).toBe('job-1');
    expect(putInput.Item.status).toBe('RUNNING');
    expect(putInput.Item.statusPk).toBe('STATUS#RUNNING');
  });

  it('returns job by id', async () => {
    sendMock.mockResolvedValueOnce({ Items: [{ jobId: 'job-2', status: 'SUCCEEDED' }] });

    const table = new JobsTable({} as never, 'JobsTable');
    const result = await table.getByJobId('job-2');

    expect(result).toEqual({ jobId: 'job-2', status: 'SUCCEEDED' });
  });

  it('updates completed job', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: [{ listPk: 'JOB', listSk: 123001, jobId: 'job-3', startedAtTs: 1000 }] })
      .mockResolvedValueOnce({});

    const table = new JobsTable({} as never, 'JobsTable');

    await table.markCompleted({
      jobId: 'job-3',
      status: 'SUCCEEDED',
      endedAt: '2026-06-01T10:01:00.000Z',
      endedAtTs: 2000,
      durationMs: 1000,
      outputSummary: { bondsUpdated: 2 },
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    const updateInput = sendMock.mock.calls[1][0].input as { ExpressionAttributeValues: Record<string, unknown> };
    expect(updateInput.ExpressionAttributeValues[':status']).toBe('SUCCEEDED');
    expect(updateInput.ExpressionAttributeValues[':statusPk']).toBe('STATUS#SUCCEEDED');
  });

  it('throws when marking completion for missing job', async () => {
    sendMock.mockResolvedValueOnce({ Items: [] });

    const table = new JobsTable({} as never, 'JobsTable');

    await expect(table.markCompleted({
      jobId: 'missing',
      status: 'FAILED',
      endedAt: '2026-06-01T10:01:00.000Z',
      endedAtTs: 2000,
      durationMs: 1000,
      errorSummary: { message: 'boom' },
    })).rejects.toThrow('JobsTable: job not found: missing');
  });
});
