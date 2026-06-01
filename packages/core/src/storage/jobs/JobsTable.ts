import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DbJobErrorSummary, DbJobRecord, JobStatus, JobWorkflowType, JobsPageCursor, JobsPageResult } from '.';

const LIST_PK = 'JOB' as const;
const JOB_ID_INDEX_NAME = 'jobIdIndex';
const EXECUTION_ARN_INDEX_NAME = 'executionArnIndex';
const STATUS_LIST_INDEX_NAME = 'statusPkListSkIndex';

const asStatusPk = (status: JobStatus): `STATUS#${JobStatus}` => `STATUS#${status}`;

export type PutStartedJobInput = {
  jobId: string;
  executionArn: string;
  workflowType: JobWorkflowType;
  startedAtTs: number;
  startedAt: string;
  inputSummary: Record<string, unknown>;
};

export type MarkJobCompletedInput = {
  jobId: string;
  status: Exclude<JobStatus, 'RUNNING'>;
  endedAtTs: number;
  endedAt: string;
  durationMs: number;
  outputSummary?: Record<string, unknown>;
  errorSummary?: DbJobErrorSummary;
};

export class JobsTable {
  readonly dynamoDBDocumentClient: DynamoDBDocumentClient;
  readonly tableName: string;

  constructor(dynamoDBClient: DynamoDBClient, tableName: string) {
    this.dynamoDBDocumentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName = tableName;
  }

  async putStarted(input: PutStartedJobInput): Promise<void> {
    const listSk = input.startedAtTs * 1000 + Math.floor(Math.random() * 1000);
    const item: DbJobRecord = {
      listPk: LIST_PK,
      listSk,
      statusPk: asStatusPk('RUNNING'),
      jobId: input.jobId,
      executionArn: input.executionArn,
      workflowType: input.workflowType,
      status: 'RUNNING',
      startedAt: input.startedAt,
      startedAtTs: input.startedAtTs,
      inputSummary: input.inputSummary,
    };

    await this.dynamoDBDocumentClient.send(new PutCommand({
      TableName: this.tableName,
      Item: item,
    }));
  }

  async markCompleted(input: MarkJobCompletedInput): Promise<void> {
    const existing = await this.getByJobId(input.jobId);
    if (!existing) {
      throw new Error(`JobsTable: job not found: ${input.jobId}`);
    }

    const setExpressions = [
      '#status = :status',
      'statusPk = :statusPk',
      'endedAt = :endedAt',
      'endedAtTs = :endedAtTs',
      'durationMs = :durationMs',
    ];
    const removeExpressions: string[] = [];
    const expressionAttributeValues: Record<string, unknown> = {
      ':status': input.status,
      ':statusPk': asStatusPk(input.status),
      ':endedAt': input.endedAt,
      ':endedAtTs': input.endedAtTs,
      ':durationMs': input.durationMs,
    };

    if (input.outputSummary !== undefined) {
      setExpressions.push('outputSummary = :outputSummary');
      expressionAttributeValues[':outputSummary'] = input.outputSummary;
    } else {
      removeExpressions.push('outputSummary');
    }

    if (input.errorSummary !== undefined) {
      setExpressions.push('errorSummary = :errorSummary');
      expressionAttributeValues[':errorSummary'] = input.errorSummary;
    } else {
      removeExpressions.push('errorSummary');
    }

    let updateExpression = `SET ${setExpressions.join(', ')}`;
    if (removeExpressions.length > 0) {
      updateExpression += ` REMOVE ${removeExpressions.join(', ')}`;
    }

    await this.dynamoDBDocumentClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { listPk: existing.listPk, listSk: existing.listSk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  async getByJobId(jobId: string): Promise<DbJobRecord | undefined> {
    const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: JOB_ID_INDEX_NAME,
      KeyConditionExpression: 'jobId = :jobId',
      ExpressionAttributeValues: {
        ':jobId': jobId,
      },
      Limit: 1,
    }));

    return result.Items?.[0] as DbJobRecord | undefined;
  }

  async getByExecutionArn(executionArn: string): Promise<DbJobRecord | undefined> {
    const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: EXECUTION_ARN_INDEX_NAME,
      KeyConditionExpression: 'executionArn = :executionArn',
      ExpressionAttributeValues: {
        ':executionArn': executionArn,
      },
      Limit: 1,
    }));

    return result.Items?.[0] as DbJobRecord | undefined;
  }

  async listNewest(limit: number, cursor?: JobsPageCursor): Promise<JobsPageResult> {
    const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'listPk = :listPk',
      ExpressionAttributeValues: {
        ':listPk': LIST_PK,
      },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor ? { listPk: LIST_PK, listSk: cursor.listSk } : undefined,
    }));

    return {
      jobs: (result.Items ?? []) as DbJobRecord[],
      nextCursor: result.LastEvaluatedKey ? { listSk: result.LastEvaluatedKey['listSk'] as number } : undefined,
    };
  }

  async listNewestByStatus(status: JobStatus, limit: number, cursor?: JobsPageCursor): Promise<JobsPageResult> {
    const result = await this.dynamoDBDocumentClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: STATUS_LIST_INDEX_NAME,
      KeyConditionExpression: 'statusPk = :statusPk',
      ExpressionAttributeValues: {
        ':statusPk': asStatusPk(status),
      },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor ? { statusPk: asStatusPk(status), listSk: cursor.listSk } : undefined,
    }));

    return {
      jobs: (result.Items ?? []) as DbJobRecord[],
      nextCursor: result.LastEvaluatedKey ? { listSk: result.LastEvaluatedKey['listSk'] as number } : undefined,
    };
  }
}
