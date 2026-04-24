import { bondDetailsTable, bondStatisticsTable, issuerProfilesTable } from "./storage";

const bondsUpdaterFunction = new sst.aws.Function("BondsUpdater", {
  handler: "packages/functions/src/bonds/updateBondReports.handler",
  memory: "512 MB",
  timeout: "10 minutes",
  environment: {
    TEMP_FOLDER: $dev ? "." : "/tmp",
  },
  link: [bondDetailsTable, bondStatisticsTable],
});

const notificationSenderFunction = new sst.aws.Function("NotificationSender", {
  handler: "packages/functions/src/emails/sendNotification.handler",
  timeout: "10 seconds",
  copyFiles: [
    { from: "packages/functions/src/emails/bondsUpdateReportNotification.pug" },
  ],
  permissions: [
    {
      actions: ["ses:SendEmail"],
      resources: ["arn:aws:ses:eu-west-1:198805281865:identity/*"],
    },
    {
      actions: ["ssm:GetParameter"],
      resources: [
        "arn:aws:ssm:eu-west-1:198805281865:parameter/catalyst-viewer/notifications/recipients",
      ],
    },
  ],
});

const collectUnclassifiedIssuersFunction = new sst.aws.Function("CollectUnclassifiedIssuers", {
  handler: "packages/functions/src/issuers/collectUnclassifiedIssuers.handler",
  timeout: "60 seconds",
  link: [bondDetailsTable, issuerProfilesTable],
});

const classifyIssuersFunction = new sst.aws.Function("ClassifyIssuers", {
  handler: "packages/functions/src/issuers/classifyIssuers.handler",
  timeout: "5 minutes",
  link: [issuerProfilesTable],
  permissions: [
    {
      actions: ["bedrock:InvokeModel"],
      resources: [
        "arn:aws:bedrock:*::foundation-model/*",
        "arn:aws:bedrock:*:*:inference-profile/*",
      ],
    },
  ],
});

const classificationNotificationSenderFunction = new sst.aws.Function("ClassificationNotificationSender", {
  handler: "packages/functions/src/emails/sendClassificationNotification.handler",
  timeout: "10 seconds",
  copyFiles: [
    { from: "packages/functions/src/emails/issuerClassificationNotification.pug" },
  ],
  permissions: [
    {
      actions: ["ses:SendEmail"],
      resources: ["arn:aws:ses:eu-west-1:198805281865:identity/*"],
    },
    {
      actions: ["ssm:GetParameter"],
      resources: [
        "arn:aws:ssm:eu-west-1:198805281865:parameter/catalyst-viewer/notifications/recipients",
      ],
    },
  ],
});

// Step Functions state machine
const sfnRole = new aws.iam.Role("BondsUpdaterSfnRole", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { Service: "states.amazonaws.com" },
        Action: "sts:AssumeRole",
      },
    ],
  }),
});

new aws.iam.RolePolicy("BondsUpdaterSfnPolicy", {
  role: sfnRole.id,
  policy: $resolve([
    bondsUpdaterFunction.arn,
    notificationSenderFunction.arn,
    collectUnclassifiedIssuersFunction.arn,
    classifyIssuersFunction.arn,
    classificationNotificationSenderFunction.arn,
  ]).apply(([updaterArn, notifArn, collectArn, classifyArn, classifNotifArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: [updaterArn, notifArn, collectArn, classifyArn, classifNotifArn],
        },
      ],
    })
  ),
});

const stateMachine = new aws.sfn.StateMachine("BondsUpdaterStateMachine", {
  roleArn: sfnRole.arn,
  definition: $resolve([
    bondsUpdaterFunction.arn,
    notificationSenderFunction.arn,
    collectUnclassifiedIssuersFunction.arn,
    classifyIssuersFunction.arn,
    classificationNotificationSenderFunction.arn,
  ]).apply(([updaterArn, notifArn, collectArn, classifyArn, classifNotifArn]) =>
    JSON.stringify({
      StartAt: "UpdateBonds",
      States: {
        "UpdateBonds": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: updaterArn,
          },
          TimeoutSeconds: 600,
          Next: "CollectUnclassifiedIssuers",
        },
        "CollectUnclassifiedIssuers": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: collectArn,
            "Payload.$": "$.Payload",
          },
          TimeoutSeconds: 60,
          Next: "HasUnclassifiedIssuers",
        },
        "HasUnclassifiedIssuers": {
          Type: "Choice",
          Choices: [
            {
              Variable: "$.Payload.unclassifiedIssuers[0]",
              IsPresent: true,
              Next: "ClassifyIssuers",
            },
          ],
          Default: "MajorChanges",
        },
        "ClassifyIssuers": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: classifyArn,
            "Payload.$": "$.Payload",
          },
          TimeoutSeconds: 300,
          Retry: [],
          Next: "SendClassificationNotification",
        },
        "SendClassificationNotification": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: classifNotifArn,
            "Payload.$": "$.Payload",
          },
          TimeoutSeconds: 10,
          Next: "MajorChanges",
        },
        "MajorChanges": {
          Type: "Choice",
          Choices: [
            {
              Or: [
                { Variable: "$.Payload.newBonds[0]", IsPresent: true },
                {
                  Variable: "$.Payload.bondsDeactivated[0]",
                  IsPresent: true,
                },
              ],
              Next: "SendNotification",
            },
          ],
          Default: "Skip",
        },
        "SendNotification": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: notifArn,
            "Payload.$": "$.Payload",
          },
          TimeoutSeconds: 10,
          End: true,
        },
        Skip: {
          Type: "Succeed",
        },
      },
    })
  ),
});

// Schedule rule - only in non-dev stages
if (!$dev) {
  const schedulerRole = new aws.iam.Role("BondsUpdaterSchedulerRole", {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "scheduler.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    }),
  });

  new aws.iam.RolePolicy("BondsUpdaterSchedulerPolicy", {
    role: schedulerRole.id,
    policy: stateMachine.arn.apply((arn) =>
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "states:StartExecution",
            Resource: arn,
          },
        ],
      })
    ),
  });

  new aws.scheduler.Schedule("BondsUpdaterSchedule", {
    scheduleExpression: "cron(0 9,12,15 ? * MON-FRI *)",
    flexibleTimeWindow: { mode: "OFF" },
    target: {
      arn: stateMachine.arn,
      roleArn: schedulerRole.arn,
    },
  });
}
