import { StackContext, Function, Cognito, Api, Table } from 'sst/constructs';
import { RemovalPolicy } from 'aws-cdk-lib';
import { UserPool, UserPoolClient } from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export function BondsService({ stack }: StackContext) {
  const auth = new Cognito(stack, "Auth", {
    cdk: {
      userPool: UserPool.fromUserPoolId(stack, "IUserPool", "eu-west-1_IVai0KEAA"),
      userPoolClient: UserPoolClient.fromUserPoolClientId(stack, "IUserPoolClient", "3qt6td581r3qqsk23tgv9r5duh"),
    },
  });

  const bondDetailsTable = new Table(stack, 'BondDetails', {
    fields: {
      bondStatus: 'string',
      updated: 'string',
      updatedTs: 'number',
      name: 'string',
      market: 'string',
      'name#market': 'string',
      isin: 'string',
      issuer: 'string',
      bondType: 'string',
      nominalValue: 'number',
      issueValue: 'number',
      currency: 'string',
      maturityDay: 'string',
      maturityDayTs: 'number',
      interestType: 'string',
      interestVariable: 'string',
      interestConst: 'number',
      interestFirstDays: 'string',
      interestFirstDayTss: 'string',
      interestRightsDays: 'string',
      interestRightsDayTss: 'string',
      interestPayoffDays: 'string',
      interestPayoffDayTss: 'string',

      currentInterestRate: 'number',
      accuredInterest: 'number',
      closingPrice: 'number',
      lastDateTime: 'string',
      lastPrice: 'number',
      bidCount: 'number',
      bidVolume: 'number',
      bidPrice: 'number',
      askPrice: 'number',
      askVolume: 'number',
      askCount: 'number'
    },
    primaryIndex: {
      partitionKey: 'bondType',
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

  const getBondsFunction = new Function(stack, "getBonds", {
    handler: 'packages/functions/src/bonds/getBonds.handler',
    memorySize: "256 MB",
    environment: {
      BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName
    },
    //permissions: [bondDetailsTableReadAccess],
    bind: [bondDetailsTable],
    timeout: '20 seconds'                                                                    
  });

  const api = new Api(stack, "api", {
    authorizers: {
      jwt: {
        type: "user_pool",
        userPool: {
          id: auth.userPoolId,
          clientIds: [auth.userPoolClientId],
        },
      },
    },
    defaults: {
      authorizer: "jwt",
      throttle: {
        burst: 1,
        rate: 1
      }
    },
    routes: {
      'GET /api/bonds': getBondsFunction,
      'GET /api/bonds/{bondType}': getBondsFunction
    }
  });
  //auth.attachPermissionsForAuthUsers(stack, [api]);

  stack.addOutputs({
    ApiEndpoint: api.url,
    UserPoolId: auth.userPoolId,
    UserPoolClientId: auth.userPoolClientId
  });

  return {
    auth,
    api,
    bondDetailsTable,
  };
}
