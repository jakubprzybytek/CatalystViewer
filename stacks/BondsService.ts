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

  const profilesTable = new Table(stack, 'Profiles', {
    fields: {
      userName: 'string',
      bondReportsBrowserSettings: 'string',
    },
    primaryIndex: {
      partitionKey: 'userName'
    },
    cdk: {
      table: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
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
      askCount: 'number',

      averageTurnover: 'number',
      tradingDaysRation: 'number',
      averageSpread: 'number'
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

  const bondStatisticsTable = new Table(stack, 'BondStatistics', {
    fields: {
      name: 'string',
      market: 'string',
      'name#market': 'string',
      year: 'number',
      month: 'number',
      'year#month': 'string',
      quotes: 'string'
    },
    primaryIndex: {
      partitionKey: 'name#market',
      sortKey: 'year#month'
    },
    cdk: {
      table: {
        removalPolicy: RemovalPolicy.DESTROY,
      },
    },
  });


  const getProfileFunction = new Function(stack, "getProfile", {
    handler: 'packages/functions/src/profile/getProfile.handler',
    memorySize: "256 MB",
    bind: [profilesTable],
    timeout: '10 seconds'
  });

  const updateProfileFunction = new Function(stack, "updateProfile", {
    handler: 'packages/functions/src/profile/updateProfile.handler',
    memorySize: "256 MB",
    bind: [profilesTable],
    timeout: '10 seconds'
  });

  const getBondsFunction = new Function(stack, "getBonds", {
    handler: 'packages/functions/src/bonds/getBondReports.handler',
    memorySize: "256 MB",
    bind: [bondDetailsTable],
    timeout: '60 seconds'
  });

  const getBondQuotesFunction = new Function(stack, "getBondQuotes", {
    handler: 'packages/functions/src/bonds/getBondQuotes.handler',
    memorySize: "256 MB",
    bind: [bondStatisticsTable],
    timeout: '10 seconds'
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
        burst: 2,
        rate: 2
      }
    },
    routes: {
      'GET /api/profile': getProfileFunction,
      'PUT /api/profile': updateProfileFunction,
      'GET /api/bonds': getBondsFunction,
      'GET /api/bonds/{bondType}': getBondsFunction,
      'GET /api/bondQuotes': getBondQuotesFunction
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
    bondStatisticsTable
  };
}
