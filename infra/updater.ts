import { bondDetailsTable, bondStatisticsTable, issuerProfilesTable, jobsTable } from "./storage";

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
  nodejs: {
    loader: { ".pug": "text" },
  },
  environment: {
    SST_STAGE: $app.stage,
  },
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
  memory: "512 MB",
  timeout: "60 seconds",
  link: [bondDetailsTable, issuerProfilesTable],
});

const sendErrorReportFunction = new sst.aws.Function("SendErrorReport_Error", {
  handler: "packages/functions/src/emails/sendErrorReport.handler",
  timeout: "30 seconds",
  environment: {
    SST_STAGE: $app.stage,
  },
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

const classifyIssuerFunction = new sst.aws.Function("ClassifyIssuer", {
  handler: "packages/functions/src/issuers/classifyIssuer.handler",
  timeout: "2 minutes",
  link: [issuerProfilesTable],
  environment: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ?? "",
  },
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

const selectIssuersFunction = new sst.aws.Function("SelectIssuers", {
  handler: "packages/functions/src/issuers/selectIssuers.handler",
  timeout: "60 seconds",
  link: [bondDetailsTable, issuerProfilesTable],
});

const analyzeIssuerFunction = new sst.aws.Function("AnalyzeIssuer", {
  handler: "packages/functions/src/issuers/analyzeIssuer.handler",
  timeout: "10 minutes",
  link: [issuerProfilesTable],
  environment: {
    TAVILY_API_KEY: process.env.TAVILY_API_KEY ?? "x",
  },
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

const sendAnalysisReportFunction = new sst.aws.Function("SendAnalysisReport", {
  handler: "packages/functions/src/emails/sendAnalysisReport.handler",
  timeout: "30 seconds",
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

const logJobStartedFunction = new sst.aws.Function("LogJobStarted", {
  handler: "packages/functions/src/jobs/logJobStarted.handler",
  timeout: "30 seconds",
  link: [jobsTable],
});

const logJobCompletedFunction = new sst.aws.Function("LogJobCompleted", {
  handler: "packages/functions/src/jobs/logJobCompleted.handler",
  timeout: "30 seconds",
  link: [jobsTable],
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
    classifyIssuerFunction.arn,
    sendErrorReportFunction.arn,
    logJobStartedFunction.arn,
    logJobCompletedFunction.arn,
  ]).apply(([updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn, logStartArn, logCompletedArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: [updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn, logStartArn, logCompletedArn],
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
    classifyIssuerFunction.arn,
    sendErrorReportFunction.arn,
    logJobStartedFunction.arn,
    logJobCompletedFunction.arn,
  ]).apply(([updaterArn, sendReportArn, collectArn, classifyIssuerArn, sendErrorReportArn, logStartArn, logCompletedArn]) =>
    JSON.stringify({
      StartAt: "LogJobStarted",
      States: {
        "LogJobStarted": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logStartArn,
            Payload: {
              workflowType: "BONDS_UPDATER",
              "executionArn.$": "$$.Execution.Id",
              "startedAt.$": "$$.State.EnteredTime",
              "input.$": "$$.Execution.Input",
            },
          },
          ResultPath: null,
          Next: "MainWorkflow",
          Catch: [
            {
              ErrorEquals: ["States.ALL"],
              Next: "MainWorkflow",
            },
          ],
        },
        "MainWorkflow": {
          Type: "Parallel",
          ResultPath: "$.mainResult",
          Branches: [
            {
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
                    classificationsCap: 10,
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
                  Type: "Map",
                  ItemsPath: "$.Payload.unclassifiedIssuers",
                  Parameters: {
                    "issuerName.$": "$$.Map.Item.Value",
                  },
                  MaxConcurrency: 1,
                  Iterator: {
                    StartAt: "ClassifyIssuer",
                    States: {
                      "ClassifyIssuer": {
                        Type: "Task",
                        Resource: "arn:aws:states:::lambda:invoke",
                        Parameters: {
                          FunctionName: classifyIssuerArn,
                          "Payload.$": "$",
                        },
                        OutputPath: "$.Payload",
                        TimeoutSeconds: 120,
                        End: true,
                        Catch: [
                          {
                            ErrorEquals: ["States.ALL"],
                            ResultPath: "$.errorInfo",
                            Next: "HandleClassificationFailure",
                          },
                        ],
                      },
                      "HandleClassificationFailure": {
                        Type: "Pass",
                        Parameters: {
                          "issuerName.$": "$.issuerName",
                          success: false,
                          "errorReason.$": "$.errorInfo.Cause",
                        },
                        End: true,
                      },
                    },
                  },
                  ResultPath: "$.Payload.classificationResults",
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
                "Skip": {
                  Type: "Succeed",
                },
              },
            },
          ],
          Catch: [
            {
              ErrorEquals: ["States.ALL"],
              ResultPath: "$.error",
              Next: "LogJobFailed",
            },
          ],
          Next: "LogJobSucceeded",
        },
        "LogJobSucceeded": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logCompletedArn,
            Payload: {
              workflowType: "BONDS_UPDATER",
              "executionArn.$": "$$.Execution.Id",
              status: "SUCCEEDED",
              "output.$": "$.mainResult[0].Payload",
              stage: "MainWorkflow",
            },
          },
          ResultPath: null,
          Next: "WorkflowSucceeded",
          Catch: [
            {
              ErrorEquals: ["States.ALL"],
              Next: "WorkflowSucceeded",
            },
          ],
        },
        "LogJobFailed": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logCompletedArn,
            Payload: {
              workflowType: "BONDS_UPDATER",
              "executionArn.$": "$$.Execution.Id",
              status: "FAILED",
              "error.$": "$.error",
              stage: "MainWorkflow",
            },
          },
          ResultPath: null,
          Next: "SendErrorReport",
          Catch: [
            {
              ErrorEquals: ["States.ALL"],
              Next: "SendErrorReport",
            },
          ],
        },
        "WorkflowSucceeded": {
          Type: "Succeed",
        },
        "SendErrorReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendErrorReportArn,
            Payload: {
              "error.$": "$.error",
              "executionArn.$": "$$.Execution.Id",
            },
          },
          TimeoutSeconds: 30,
          End: true,
        },
      },
    })
  ),
});

// ─── Fundamental Analysis State Machine ──────────────────────────────────────

const fundamentalAnalysisSfnRole = new aws.iam.Role("FundamentalAnalysisSfnRole", {
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

new aws.iam.RolePolicy("FundamentalAnalysisSfnPolicy", {
  role: fundamentalAnalysisSfnRole.id,
  policy: $resolve([
    selectIssuersFunction.arn,
    analyzeIssuerFunction.arn,
    sendAnalysisReportFunction.arn,
    sendErrorReportFunction.arn,
    logJobStartedFunction.arn,
    logJobCompletedFunction.arn,
  ]).apply(([selectArn, analyzeArn, sendReportArn, sendErrorArn, logStartArn, logCompletedArn]) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: [selectArn, analyzeArn, sendReportArn, sendErrorArn, logStartArn, logCompletedArn],
        },
      ],
    })
  ),
});

new aws.sfn.StateMachine("FundamentalAnalysisStateMachine", {
  name: `FundamentalAnalysisStateMachine-${$app.stage}`,
  roleArn: fundamentalAnalysisSfnRole.arn,
  definition: $resolve([
    selectIssuersFunction.arn,
    analyzeIssuerFunction.arn,
    sendAnalysisReportFunction.arn,
    sendErrorReportFunction.arn,
    logJobStartedFunction.arn,
    logJobCompletedFunction.arn,
  ]).apply(([selectArn, analyzeArn, sendReportArn, sendErrorArn, logStartArn, logCompletedArn]) =>
    JSON.stringify({
      StartAt: "LogJobStarted",
      States: {
        "LogJobStarted": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logStartArn,
            Payload: {
              workflowType: "FUNDAMENTAL_ANALYSIS",
              "executionArn.$": "$$.Execution.Id",
              "startedAt.$": "$$.State.EnteredTime",
              "input.$": "$$.Execution.Input",
            },
          },
          ResultPath: null,
          Next: "SelectIssuers",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SelectIssuers" }],
        },
        "SelectIssuers": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: selectArn,
            "Payload.$": "$",
          },
          ResultSelector: {
            "selectedIssuers.$": "$.Payload.selectedIssuers",
          },
          ResultPath: "$",
          TimeoutSeconds: 60,
          Next: "AnalyzeIssuers",
          Catch: [{ ErrorEquals: ["States.ALL"], ResultPath: "$.error", Next: "LogJobFailed" }],
        },
        "AnalyzeIssuers": {
          Type: "Map",
          ItemsPath: "$.selectedIssuers",
          Parameters: {
            "issuerName.$": "$$.Map.Item.Value",
          },
          MaxConcurrency: 1,
          Iterator: {
            StartAt: "AnalyzeIssuer",
            States: {
              "AnalyzeIssuer": {
                Type: "Task",
                Resource: "arn:aws:states:::lambda:invoke",
                Parameters: {
                  FunctionName: analyzeArn,
                  "Payload.$": "$",
                },
                ResultSelector: {
                  "issuerName.$": "$.Payload.issuerName",
                  "performedAt.$": "$.Payload.performedAt",
                  "success.$": "$.Payload.success",
                },
                TimeoutSeconds: 600,
                End: true,
                Catch: [
                  {
                    ErrorEquals: ["States.ALL"],
                    ResultPath: "$.errorInfo",
                    Next: "HandleAnalysisFailure",
                  },
                ],
              },
              "HandleAnalysisFailure": {
                Type: "Pass",
                Parameters: {
                  "issuerName.$": "$.issuerName",
                  "success": false,
                  "error.$": "$.errorInfo.Cause",
                },
                End: true,
              },
            },
          },
          Next: "LogJobSucceeded",
          Catch: [{ ErrorEquals: ["States.ALL"], ResultPath: "$.error", Next: "LogJobFailed" }],
        },
        "LogJobSucceeded": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logCompletedArn,
            Payload: {
              workflowType: "FUNDAMENTAL_ANALYSIS",
              "executionArn.$": "$$.Execution.Id",
              status: "SUCCEEDED",
              "output.$": "$",
              stage: "AnalyzeIssuers",
            },
          },
          ResultPath: null,
          Next: "SendAnalysisReport",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SendAnalysisReport" }],
        },
        "SendAnalysisReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendReportArn,
            "Payload.$": "$",
          },
          TimeoutSeconds: 30,
          Next: "Done",
          Catch: [{ ErrorEquals: ["States.ALL"], ResultPath: "$.error", Next: "LogJobFailed" }],
        },
        "Done": {
          Type: "Succeed",
        },
        "LogJobFailed": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: logCompletedArn,
            Payload: {
              workflowType: "FUNDAMENTAL_ANALYSIS",
              "executionArn.$": "$$.Execution.Id",
              status: "FAILED",
              "error.$": "$.error",
              stage: "WorkflowFailure",
            },
          },
          ResultPath: null,
          Next: "SendErrorReport",
          Catch: [{ ErrorEquals: ["States.ALL"], Next: "SendErrorReport" }],
        },
        "SendErrorReport": {
          Type: "Task",
          Resource: "arn:aws:states:::lambda:invoke",
          Parameters: {
            FunctionName: sendErrorArn,
            Payload: {
              "error.$": "$.error",
              "executionArn.$": "$$.Execution.Id",
            },
          },
          TimeoutSeconds: 30,
          Next: "Fail",
        },
        "Fail": {
          Type: "Fail",
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
