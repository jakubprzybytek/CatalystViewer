import { StackContext, Function, use } from '@serverless-stack/resources';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { BondsService } from './BondsService';

export function BondsUpdater({ stack, app }: StackContext) {
  const { api, bondDetailsTable } = use(BondsService);

  const bondDetailsTableWriteAccess = new iam.PolicyStatement({
    actions: ['dynamodb:Scan', 'dynamodb:BatchWriteItem'],
    effect: iam.Effect.ALLOW,
    resources: [bondDetailsTable.tableArn]
  });

  const bondsUpdaterFunction = new Function(stack, 'BondsUpdaterFunction', {
    handler: 'api/bonds/updateBonds.handler',
    environment: {
      BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName,
      TEMP_FOLDER: app.local ? '.' : '/tmp'
    },
    timeout: '10 minutes',
    permissions: [bondDetailsTableWriteAccess]
  })

  new sfn.StateMachine(stack, stack.stage + '-BondsUpdaterStateMachine', {
    definition: new tasks.LambdaInvoke(stack, "UpdateBondsTask", {
      lambdaFunction: bondsUpdaterFunction,
      timeout: Duration.minutes(10)
    })
  });

  api.addRoutes(stack, {
    'GET /api/updates': {
      function: {
        handler: 'api/stepFunctions/getExecutions.handler',
        environment: {
          BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName
        },
        permissions: [],
        timeout: '10 seconds'
      }
    }

  });
}
