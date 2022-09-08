import { StackContext, Function, use } from '@serverless-stack/resources';
import { Duration } from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { BondsService } from './BondsService';

export function BondsUpdater({ stack }: StackContext) {
  const { bondDetailsTable, bondDetailsTableReadAccess } = use(BondsService);

  const bondsUpdaterFunction = new Function(stack, 'BondsUpdaterFunction', {
    handler: 'functions/bonds/updateBonds.handler',
    environment: {
      BOND_DETAILS_TABLE_NAME: bondDetailsTable.tableName
    },
    timeout: '10 minutes',
    permissions: [bondDetailsTableReadAccess]
  })

  new sfn.StateMachine(stack, stack.stage + '-BondsUpdaterStateMachine', {
    definition: new tasks.LambdaInvoke(stack, "UpdateBondsTask", {
      lambdaFunction: bondsUpdaterFunction,
      timeout: Duration.minutes(10)
    }).next(new sfn.Succeed(stack, "Bonds Updated!"))
  });
}
