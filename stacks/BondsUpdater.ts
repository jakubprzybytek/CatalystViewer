import { StackContext, Function, use } from 'sst/constructs';
import { Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { BondsService } from './BondsService';

export function BondsUpdater({ stack, app }: StackContext) {
  const { bondDetailsTable, bondStatisticsTable } = use(BondsService);

  const bondsUpdaterFunction = new Function(stack, 'BondsUpdaterFunction', {
    handler: 'packages/functions/src/bonds/updateBondReports.handler',
    environment: {
      TEMP_FOLDER: app.local ? '.' : '/tmp'
    },
    timeout: '10 minutes',
    bind: [bondDetailsTable, bondStatisticsTable]
  });

  const bondsUpdaterTask = new tasks.LambdaInvoke(stack, "Update Bonds", {
    lambdaFunction: bondsUpdaterFunction,
    taskTimeout: sfn.Timeout.duration(Duration.minutes(10))
  })

  const sendEmailPolicy = new iam.PolicyStatement({
    actions: ['ses:SendEmail'],
    effect: iam.Effect.ALLOW,
    resources: [
      'arn:aws:ses:eu-west-1:198805281865:identity/*'
    ]
  });

  const getRecipientsEmailsPolicy = new iam.PolicyStatement({
    actions: ['ssm:GetParameter'],
    effect: iam.Effect.ALLOW,
    resources: ['arn:aws:ssm:eu-west-1:198805281865:parameter/catalyst-viewer/notifications/recipients']
  });

  const notificationSenderFunction = new Function(stack, 'NotificationSenderFunction', {
    handler: 'packages/functions/src/emails/sendNotification.handler',
    copyFiles: [{ from: 'packages/functions/src/emails/bondsUpdateReportNotification.pug' }],
    timeout: '10 seconds',
    permissions: [getRecipientsEmailsPolicy, sendEmailPolicy]
  });

  const notificationSenderTask = new tasks.LambdaInvoke(stack, "Send Notification", {
    lambdaFunction: notificationSenderFunction,
    payload: sfn.TaskInput.fromJsonPathAt('$.Payload'),
    taskTimeout: sfn.Timeout.duration(Duration.seconds(10))
  });

  const sendNotificationFlow = new sfn.Choice(stack, "Major changes?")
    .when(sfn.Condition.or(
      sfn.Condition.isPresent('$.Payload.newBonds[0]'),
      sfn.Condition.isPresent('$.Payload.bondsDeactivated[0]')
    ), notificationSenderTask)
    .otherwise(new sfn.Succeed(stack, 'Skip'));

  const bondsUpdaterStateMachine = new sfn.StateMachine(stack, stack.stage + '-BondsUpdaterStateMachine', {
    definitionBody: sfn.DefinitionBody.fromChainable(
      bondsUpdaterTask
        .next(sendNotificationFlow)
    )
  });

  if (!app.local) {
    new events.Rule(stack, 'BondsUpdaterScheduleRule', {
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '9,12,15',
        month: '*',
        weekDay: 'MON-FRI',
        year: '*'
      }),
      targets: [new targets.SfnStateMachine(bondsUpdaterStateMachine)]
    });
  }
}
