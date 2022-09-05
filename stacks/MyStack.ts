import { StackContext, Api, Table } from "@serverless-stack/resources";
import * as iam from "aws-cdk-lib/aws-iam";

export function MyStack({ stack }: StackContext) {
  const bondDetailsTable = new Table(stack, 'BondDetails', {
    fields: {
      name: 'string',
      market: 'string',
      'name#market': 'string',
      issuer: 'string',
      type: 'string',
      nominalValue: 'number',
      maturityDay: 'string',
      currentInterestRate: 'number',
      accuredInterest: 'number'
    },
    primaryIndex: {
      partitionKey: 'issuer',
      sortKey: 'name#market'
    }
  });

  const bondsDetailsTableReacAccess = new iam.PolicyStatement({
    actions: ['dynamodb:Scan'],
    effect: iam.Effect.ALLOW,
    resources: [bondDetailsTable.tableArn]
  });

  const api = new Api(stack, "api", {
    routes: {
      'GET /': 'functions/lambda.handler',
      'GET /api/bonds': {
        function: {
          handler: 'functions/bonds/getBonds.handler',
          environment: {
            BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName
          },
          permissions: [bondsDetailsTableReacAccess]
        }
      }
    }
  });

  stack.addOutputs({
    ApiEndpoint: api.url
  });
}
