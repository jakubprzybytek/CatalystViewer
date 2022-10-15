import { StackContext, Api, Table } from '@serverless-stack/resources';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export function BondsService({ stack }: StackContext) {
  const bondDetailsTable = new Table(stack, 'BondDetails', {
    fields: {
      bondStatus: 'string',
      updated: 'string',
      name: 'string',
      market: 'string',
      'name#market': 'string',
      isin: 'string',
      issuer: 'string',
      type: 'string',
      nominalValue: 'number',
      currency: 'string',
      maturityDay: 'string',
      maturityDayTs: 'number',
      interestType: 'string',
      interestVariable: 'string',
      interestConst: 'number',
      currentInterestRate: 'number',
      accuredInterest: 'number',
      interestFirstDays: 'string',
      interestFirstDayTss: 'string',
      interestRightsDays: 'string',
      interestRightsDayTss: 'string',
      interestPayoffDays: 'string',
      interestPayoffDayTss: 'string'
    },
    primaryIndex: {
      partitionKey: 'issuer',
      sortKey: 'name#market'
    },
    cdk: {
      table: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
    },
  });

  const bondDetailsTableReadAccess = new iam.PolicyStatement({
    actions: ['dynamodb:Scan'],
    effect: iam.Effect.ALLOW,
    resources: [bondDetailsTable.tableArn]
  });

  const api = new Api(stack, "api", {
    routes: {
      'GET /': 'api/lambda.handler',
      'GET /api/bonds': {
        function: {
          handler: 'api/bonds/getBonds.handler',
          environment: {
            BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName
          },
          permissions: [bondDetailsTableReadAccess],
          timeout: '20 seconds'
        }
      }
    }
  });

  stack.addOutputs({
    ApiEndpoint: api.url
  });

  return {
    api,
    bondDetailsTable,
  };
}
