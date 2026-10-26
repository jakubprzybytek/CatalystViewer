// Pieces shared by the workflows (updater.ts, analysis.ts): job history logging,
// the failure email, and helpers for writing Step Functions states.
import { jobsTable } from "./storage";

const SF = sst.aws.StepFunctions;

// Step Functions evaluates "{% ... %}" strings as JSONata expressions.
export const jsonata = (expression: string) => `{% ${expression} %}` as const;

export const executionInput = "$states.context.Execution.Input";

export type WorkflowType = "BONDS_UPDATER" | "FUNDAMENTAL_ANALYSIS";

// The existing state machines are adopted (alias) instead of replaced, so names,
// execution history and everything referring to them by name stay the same.
export function keepStateMachine(name: string) {
  return {
    stateMachine: (args: aws.sfn.StateMachineArgs, opts: $util.CustomResourceOptions): undefined => {
      args.name = `${name}-${$app.stage}`;
      // With logging: false SST still sets an invalid log destination ("undefined:*").
      args.loggingConfiguration = undefined;
      opts.aliases = [`urn:pulumi:${$app.stage}::${$app.name}::aws:sfn/stateMachine:StateMachine::${name}`];
    },
  };
}

export const emailPermissions = [
  {
    actions: ["ses:SendEmail"],
    resources: ["arn:aws:ses:eu-west-1:198805281865:identity/*"],
  },
  {
    actions: ["ssm:GetParameter"],
    resources: ["arn:aws:ssm:eu-west-1:198805281865:parameter/catalyst-viewer/notifications/recipients"],
  },
];

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

const sendErrorReportFunction = new sst.aws.Function("SendErrorReport_Error", {
  handler: "packages/functions/src/emails/sendErrorReport.handler",
  timeout: "30 seconds",
  environment: {
    SST_STAGE: $app.stage,
  },
  permissions: emailPermissions,
});

// Logging steps pass their input through, so the workflow continues with the same data.
// The handlers swallow their own errors, so these steps only fail if Lambda itself does.
//
// SST's StepFunctions builder (beta) rules for catch(target):
// - Call it before target is linked with next() from another step: a catch jumps to
//   the first step of the target's chain.
// - A step reached both by catch() and next() must not lead to a Map or Parallel
//   (SST rejects it as "reused"). So the job start log retries and then fails the job,
//   while a failed completion log (no Map/Parallel after it) just moves on.
// - Don't set a step timeout: SST writes it as "Timeout", which AWS rejects. Each
//   Lambda's own timeout limits its step.

export const logJobStarted = (workflowType: WorkflowType) =>
  SF.lambdaInvoke({
    name: "LogJobStarted",
    function: logJobStartedFunction,
    payload: {
      workflowType,
      executionArn: jsonata("$states.context.Execution.Id"),
      startedAt: jsonata("$states.context.State.EnteredTime"),
      input: jsonata(executionInput),
    },
    output: jsonata("$states.input"),
  });

export const logJobSucceeded = (workflowType: WorkflowType, args: { output: string; stage: string }) =>
  SF.lambdaInvoke({
    name: "LogJobSucceeded",
    function: logJobCompletedFunction,
    payload: {
      workflowType,
      executionArn: jsonata("$states.context.Execution.Id"),
      status: "SUCCEEDED",
      output: jsonata(args.output),
      stage: args.stage,
    },
    output: jsonata("$states.input"),
  });

// Entered from a catch, so the input is the error ({ Error, Cause }).
export const logJobFailed = (workflowType: WorkflowType, stage: string) =>
  SF.lambdaInvoke({
    name: "LogJobFailed",
    function: logJobCompletedFunction,
    payload: {
      workflowType,
      executionArn: jsonata("$states.context.Execution.Id"),
      status: "FAILED",
      error: jsonata("$states.input"),
      stage,
    },
    output: jsonata("$states.input"),
  });

export const sendErrorReport = () =>
  SF.lambdaInvoke({
    name: "SendErrorReport",
    function: sendErrorReportFunction,
    payload: {
      error: jsonata("$states.input"),
      executionArn: jsonata("$states.context.Execution.Id"),
    },
  });
