// Fundamental Analysis: AI analysis of selected issuers, results emailed.
// Started from the web app (see infra/api.ts).
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
import { bondDetailsTable, issuerProfilesTable } from "./storage";

const SF = sst.aws.StepFunctions;

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
      resources: ["arn:aws:bedrock:*::foundation-model/*", "arn:aws:bedrock:*:*:inference-profile/*"],
    },
  ],
});

const sendAnalysisReportFunction = new sst.aws.Function("SendAnalysisReport", {
  handler: "packages/functions/src/emails/sendAnalysisReport.handler",
  timeout: "30 seconds",
  permissions: emailPermissions,
});

// ─── Workflow ────────────────────────────────────────────────────────────────

// Execution input: { issuers: [...] } or { count: n } (see selectIssuers.ts).
const selectIssuers = SF.lambdaInvoke({
  name: "SelectIssuers",
  function: selectIssuersFunction,
  payload: jsonata(executionInput),
  output: { selectedIssuers: jsonata("$states.result.Payload.selectedIssuers") },
});

// One issuer at a time. A failed analysis becomes a failed result instead of failing
// the workflow. The issuer name is kept in a variable, because a catch replaces the
// step's input with the error.
const rememberIssuer = SF.pass({
  name: "RememberIssuer",
  assign: { issuerName: jsonata("$states.input") },
});

const analyzeIssuer = SF.lambdaInvoke({
  name: "AnalyzeIssuer",
  function: analyzeIssuerFunction,
  payload: { issuerName: jsonata("$issuerName") },
  output: {
    issuerName: jsonata("$states.result.Payload.issuerName"),
    performedAt: jsonata("$states.result.Payload.performedAt"),
    success: jsonata("$states.result.Payload.success"),
  },
});

const analysisFailed = SF.pass({
  name: "HandleAnalysisFailure",
  output: { issuerName: jsonata("$issuerName"), success: false, error: jsonata("$states.input.Cause") },
});

rememberIssuer.next(analyzeIssuer).catch(analysisFailed);

// Results are also kept in a variable for the report, which may be reached from a catch.
const analyzeIssuers = SF.map({
  name: "AnalyzeIssuers",
  items: jsonata("$states.input.selectedIssuers"),
  maxConcurrency: 1,
  processor: rememberIssuer,
  output: jsonata(`$merge([$states.input, { "analysedIssuers": $states.result }])`),
  assign: { analysedIssuers: jsonata("$states.result") },
});

const sendAnalysisReport = SF.lambdaInvoke({
  name: "SendAnalysisReport",
  function: sendAnalysisReportFunction,
  payload: jsonata("$analysedIssuers"),
});

const start = logJobStarted("FUNDAMENTAL_ANALYSIS");
const failed = logJobFailed("FUNDAMENTAL_ANALYSIS", "WorkflowFailure");
const errorReport = sendErrorReport();
const logSucceeded = logJobSucceeded("FUNDAMENTAL_ANALYSIS", { output: "$states.input", stage: "AnalyzeIssuers" });

// One line per step: where to go on failure, then on success. See jobs.ts for the
// rules SST's builder imposes on catch().
start.retry().catch(failed).next(selectIssuers);
selectIssuers.catch(failed).next(analyzeIssuers);
analyzeIssuers.catch(failed).next(logSucceeded);
logSucceeded.catch(sendAnalysisReport).next(sendAnalysisReport);
sendAnalysisReport.catch(failed).next(SF.succeed({ name: "Done" }));
failed.catch(errorReport).next(errorReport);
errorReport.next(SF.fail({ name: "Fail" }));

new sst.aws.StepFunctions("FundamentalAnalysisWorkflow", {
  definition: start,
  logging: false,
  transform: keepStateMachine("FundamentalAnalysisStateMachine"),
});
