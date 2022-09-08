import { StackContext, Function } from '@serverless-stack/resources';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export function BondsUpdater({ stack }: StackContext) {
  const bondsUpdaterFunction = new Function(stack, 'BondsUpdaterFunction', {
    handler: 'functions/bonds/updateBonds.handler'
  })

  const stateMachine = new sfn.StateMachine(stack, 'BondsUpdaterStateMachine', {
    definition: new tasks.LambdaInvoke(stack, "UpdateBondsTask", {
      lambdaFunction: bondsUpdaterFunction
    }).next(new sfn.Succeed(stack, "Bonds Updated!"))
  });
}
