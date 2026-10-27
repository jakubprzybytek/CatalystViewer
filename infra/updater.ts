// Bonds Updater: refreshes bond data, classifies new issuers with AI and emails a report.
// Started by the schedule below (prod only) or from the web app.
import {
  emailPermissions,
  executionInput,
  jsonata,
  keepStateMachine,
  logJobFailed,
  logJobStarted,
  logJobSucceeded,
  sendErrorReport,
} from "./jobs";
import { scheduleEnabled, useFixtures } from "./stage";
import { bondDetailsTable, bondStatisticsTable, issuerProfilesTable } from "./storage";

const SF = sst.aws.StepFunctions;

const DEFAULT_CLASSIFICATIONS_CAP = 10;

const bondsUpdaterFunction = new sst.aws.Function("BondsUpdater", {
  handler: "packages/functions/src/bonds/updateBondReports.handler",
  memory: "512 MB",
  timeout: "10 minutes",
  environment: {
    TEMP_FOLDER: $dev ? "." : "/tmp",
    // int: read the bundled fixture files instead of gpwcatalyst.pl and obligacje.pl (core/common/Fixtures.ts)
    ...(useFixtures ? { SOURCE_FIXTURES: $dev ? "tests/fixtures/sources" : "fixtures" } : {}),
  },
  copyFiles: useFixtures ? [{ from: "tests/fixtures/sources", to: "fixtures" }] : undefined,
  link: [bondDetailsTable, bondStatisticsTable],
});

const collectUnclassifiedIssuersFunction = new sst.aws.Function("CollectUnclassifiedIssuers", {
  handler: "packages/functions/src/issuers/collectUnclassifiedIssuers.handler",
  memory: "512 MB",
  timeout: "60 seconds",
  link: [bondDetailsTable, issuerProfilesTable],
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
      resources: ["arn:aws:bedrock:*::foundation-model/*", "arn:aws:bedrock:*:*:inference-profile/*"],
    },
  ],
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
  permissions: emailPermissions,
});

// ─── Workflow ────────────────────────────────────────────────────────────────
// The steps pass along one "report" object: the updater result, extended with the
// issuers to classify and the classification results. It's the input of SendReport.

// Execution input { updateBonds: false } skips the update (in the Lambda) and only classifies issuers.
const updateBonds = SF.lambdaInvoke({
  name: "UpdateBonds",
  function: bondsUpdaterFunction,
  payload: jsonata(executionInput),
  output: jsonata("$states.result.Payload"),
});

// Execution input can set classificationsCap and forceClassification (all issuers).
const collectUnclassifiedIssuers = SF.lambdaInvoke({
  name: "CollectUnclassifiedIssuers",
  function: collectUnclassifiedIssuersFunction,
  payload: jsonata(`$merge([
    $states.input,
    { "classificationsCap": $exists(${executionInput}.classificationsCap) ? ${executionInput}.classificationsCap : ${DEFAULT_CLASSIFICATIONS_CAP} },
    ${executionInput}.forceClassification = true ? { "forceClassification": true } : {}
  ])`),
  output: jsonata("$states.result.Payload"),
});

// One issuer at a time. A failed classification becomes a failed result in the report
// instead of failing the workflow. The issuer name is kept in a variable, because a
// catch replaces the step's input with the error.
const rememberIssuer = SF.pass({
  name: "RememberIssuer",
  assign: { issuerName: jsonata("$states.input") },
});

const classifyIssuer = SF.lambdaInvoke({
  name: "ClassifyIssuer",
  function: classifyIssuerFunction,
  payload: { issuerName: jsonata("$issuerName") },
  output: jsonata("$states.result.Payload"),
});

const classificationFailed = SF.pass({
  name: "HandleClassificationFailure",
  output: { issuerName: jsonata("$issuerName"), success: false, errorReason: jsonata("$states.input.Cause") },
});

rememberIssuer.next(classifyIssuer).catch(classificationFailed);

const classifyIssuers = SF.map({
  name: "ClassifyIssuers",
  items: jsonata("$states.input.unclassifiedIssuers"),
  maxConcurrency: 1,
  processor: rememberIssuer,
  output: jsonata(`$merge([$states.input, { "classificationResults": $states.result }])`),
});

const hasUnclassifiedIssuers = SF.choice({ name: "HasUnclassifiedIssuers" });

// The report is only sent when there's something new to report.
const sendReportOrSkip = SF.choice({ name: "ShouldSendReport" });

const sendReport = SF.lambdaInvoke({
  name: "SendReport",
  function: sendReportFunction,
  payload: jsonata("$states.input"),
  output: jsonata("$states.input"),
});

updateBonds.next(collectUnclassifiedIssuers).next(hasUnclassifiedIssuers);
hasUnclassifiedIssuers
  .when(jsonata("$count($states.input.unclassifiedIssuers) > 0"), classifyIssuers)
  .otherwise(sendReportOrSkip);
classifyIssuers.next(sendReportOrSkip);

sendReportOrSkip
  .when(
    jsonata(`$count($states.input.newBonds) > 0
      or $count($states.input.bondsDeactivated) > 0
      or $count($states.input.unclassifiedIssuers) > 0`),
    sendReport,
  )
  .otherwise(SF.succeed({ name: "Skip" }));

// Wrapped in a Parallel only to catch a failure of any step in one place.
const mainWorkflow = SF.parallel({ name: "MainWorkflow" }).branch(updateBonds);

const start = logJobStarted("BONDS_UPDATER");
const succeeded = SF.succeed({ name: "WorkflowSucceeded" });

const logSucceeded = logJobSucceeded("BONDS_UPDATER", { output: "$states.input[0]", stage: "MainWorkflow" });
const failed = logJobFailed("BONDS_UPDATER", "MainWorkflow");
const errorReport = sendErrorReport();

// One line per step: where to go on failure, then on success. See jobs.ts for the
// rules SST's builder imposes on catch().
start.retry().catch(failed).next(mainWorkflow);
mainWorkflow.catch(failed).next(logSucceeded);
logSucceeded.catch(succeeded).next(succeeded);
failed.catch(errorReport).next(errorReport);

const stateMachine = new sst.aws.StepFunctions("BondsUpdaterWorkflow", {
  definition: start,
  logging: false,
  transform: keepStateMachine("BondsUpdaterStateMachine"),
});

// Schedule - only in stages that run on live data (see infra/stage.ts)
if (scheduleEnabled) {
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
    policy: $jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: "states:StartExecution",
          Resource: stateMachine.arn,
        },
      ],
    }),
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
