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

const sendReportFunction = new sst.aws.Function("SendReport", {
  handler: "packages/functions/src/emails/sendReport.handler",
  timeout: "30 seconds",
  copyFiles: [
    { from: "packages/functions/src/emails/reportNotification.pug" },
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
    sendReportFunction.arn,
    collectUnclassifiedIssuersFunction.arn,
    classifyIssuersFunction.arn,
  ]).apply(([updaterArn, sendReportArn, collectArn, classifyArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: [updaterArn, sendReportArn, collectArn, classifyArn],
        },
      ],
    })
  ),
});

const stateMachine = new aws.sfn.StateMachine("BondsUpdaterStateMachine", {
  name: `BondsUpdaterStateMachine-${$app.stage}`,
  roleArn: sfnRole.arn,
  definition: $resolve([
    bondsUpdaterFunction.arn,
    sendReportFunction.arn,
    collectUnclassifiedIssuersFunction.arn,
    classifyIssuersFunction.arn,
  ]).apply(([updaterArn, sendReportArn, collectArn, classifyArn]) =>
    JSON.stringify({
      StartAt: "ShouldUpdateBonds",
      States: {
        "ShouldUpdateBonds": {
          Type: "Choice",
          Choices: [
            {
              And: [
                { Variable: "$.updateBonds", IsPresent: true },
                { Variable: "$.updateBonds", BooleanEquals: false },
              ],
              Next: "PrepareClassificationOnlyInput",
            },
          ],
          Default: "UpdateBonds",
        },
        "PrepareClassificationOnlyInput": {
          Type: "Pass",
          Result: {
            bondsUpdated: 0,
            newBonds: [],
            bondsDeactivated: [],
            bondsFailed: [],
          },
          ResultPath: "$.Payload",
          Next: "HasClassificationsCap",
        },
        "UpdateBonds": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: updaterArn,
          },
          TimeoutSeconds: 600,
          Next: "HasClassificationsCap",
        },
        "HasClassificationsCap": {
          Type: "Choice",
          Choices: [
            {
              Variable: "$$.Execution.Input.classificationsCap",
              IsPresent: true,
              Next: "ApplyProvidedClassificationsCap",
            },
          ],
          Default: "ApplyDefaultClassificationsCap",
        },
        "ApplyProvidedClassificationsCap": {
          Type: "Pass",
          Parameters: {
            "bondsUpdated.$": "$.Payload.bondsUpdated",
            "newBonds.$": "$.Payload.newBonds",
            "bondsDeactivated.$": "$.Payload.bondsDeactivated",
            "bondsFailed.$": "$.Payload.bondsFailed",
            "classificationsCap.$": "$$.Execution.Input.classificationsCap",
          },
          ResultPath: "$.Payload",
          Next: "HasForceClassification",
        },
        "ApplyDefaultClassificationsCap": {
          Type: "Pass",
          Parameters: {
            "bondsUpdated.$": "$.Payload.bondsUpdated",
            "newBonds.$": "$.Payload.newBonds",
            "bondsDeactivated.$": "$.Payload.bondsDeactivated",
            "bondsFailed.$": "$.Payload.bondsFailed",
            classificationsCap: 20,
          },
          ResultPath: "$.Payload",
          Next: "HasForceClassification",
        },
        "HasForceClassification": {
          Type: "Choice",
          Choices: [
            {
              And: [
                {
                  Variable: "$$.Execution.Input.forceClassification",
                  IsPresent: true,
                },
                {
                  Variable: "$$.Execution.Input.forceClassification",
                  BooleanEquals: true,
                },
              ],
              Next: "ApplyForceClassification",
            },
          ],
          Default: "CollectUnclassifiedIssuers",
        },
        "ApplyForceClassification": {
          Type: "Pass",
          Result: true,
          ResultPath: "$.Payload.forceClassification",
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
          Default: "ShouldSendReport",
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
          Next: "ShouldSendReport",
        },
        "ShouldSendReport": {
          Type: "Choice",
          Choices: [
            {
              Or: [
                { Variable: "$.Payload.newBonds[0]", IsPresent: true },
                { Variable: "$.Payload.bondsDeactivated[0]", IsPresent: true },
                { Variable: "$.Payload.unclassifiedIssuers[0]", IsPresent: true },
              ],
              Next: "SendReport",
            },
          ],
          Default: "Skip",
        },
        "SendReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendReportArn,
            "Payload.$": "$.Payload",
          },
          TimeoutSeconds: 30,
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
