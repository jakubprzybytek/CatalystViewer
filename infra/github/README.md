# GitHub Actions deploy role

This repo deploys to AWS following the [aws-github-deploy standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/aws-github-deploy/STANDARD.md).

| | |
|---|---|
| Role | `GitHub-CatalystViewer` |
| Policies | `SST-Deployment` (shared), `CatalystViewer-Deployment` (this repo, [deploy-policy.json](deploy-policy.json)) |
| SST app name / resource prefix | `catalyst-viewer`, plus the unprefixed names listed under deviations |
| Region | `eu-west-1` (CloudFront certificate in `us-east-1`) |
| Workflows that deploy | `.github/workflows/deploy-stage.yml`, called by `delivery.yml` (int, then prod from the release tag) and `deploy-prod.yml` (manual prod deploy of a tag) |
| GitHub | secret `AWS_ACCOUNT_ID`, variable `AWS_REGION` |

`deploy-policy.json` has `ACCOUNT_ID` in place of the account number. The rendered policy and the trust policy are in `private/` (gitignored).

## What the project policy covers

The app is a Next.js site on CloudFront, an API Gateway (HTTP API) with Lambda handlers and a Cognito authorizer on the shared user pool, DynamoDB tables, and two Step Functions state machines (bonds updater, fundamental analysis) with an EventBridge Scheduler schedule.

- `Identity`: `sts:GetCallerIdentity`.
- `SstState`: SST parameters under `/sst/*`, including the `TAVILY_API_KEY` secret.
- `NotificationRecipients`: read `/catalyst-viewer/*` parameters, which the infra code reads at deploy time.
- `Buckets`: S3 on the site bucket (`catalyst-viewer-*`) and the SST asset bucket (`sst-asset-*`).
- `Functions`: Lambda functions `catalyst-viewer-*` and `SiteRevalidationEventsSubscriber*`, and event source mappings (the site's revalidation queue).
- `EventSourceMappingsCreate`: creating and listing event source mappings only accepts `Resource: "*"`.
- `Logs`, `ApiAccessLogDelivery`: CloudWatch log groups in eu-west-1; log deliveries for the API's access logs (`Resource: "*"` only).
- `ApiGateway`: API Gateway in eu-west-1.
- `Queues`, `Tables`: SQS queues and DynamoDB tables `catalyst-viewer-*`.
- `StateMachines`: `BondsUpdaterStateMachine-*` and `FundamentalAnalysisStateMachine-*`, and the Bonds Updater's executions, which the pipeline's seed step starts on int and waits for (`states:DescribeExecution` checks the execution ARN; added 2026-10-27).
- `StateMachineValidation`: `states:ValidateStateMachineDefinition`, which the Pulumi AWS provider calls on every definition change. It isn't tied to a state machine, so it's scoped to `stateMachine:*` (added 2026-10-26).
- `Schedules`: `BondsUpdaterSchedule-*` (any group).
- `Auth`: the app's client on the shared Cognito user pool.
- `Edge`: CloudFront (distribution, function, cache policy, KeyValueStore), ACM and Route 53. Account-wide; these services can't be scoped usefully.
- `Roles`: IAM roles for the functions, state machines and schedule (names below).
- `PassRoles`: pass those roles to Lambda, Step Functions and EventBridge Scheduler only.

## Deviations from the standard

- **Some resources don't start with `catalyst-viewer-`**, so the policy lists their name patterns too:
  - the workflows in `infra/updater.ts` and `infra/analysis.ts`: state machines `BondsUpdaterStateMachine-<stage>` and `FundamentalAnalysisStateMachine-<stage>` (names kept from before they moved to `sst.aws.StepFunctions`; their roles are `catalyst-viewer-<stage>-…WorkflowRole-*`), the schedule `BondsUpdaterSchedule-*` and its role `BondsUpdaterSchedulerRole-*`;
  - the Next.js site's revalidation subscriber, which SST names `SiteRevalidationEventsSubscriber…` (function) and `<stage>-SiteRevalidationEventsSubscriber…` (role).

  No other app in the account uses these names. Giving them a `catalyst-viewer-` name would replace the resources, so it isn't done.

## Changing the role or policy

From the repo root, with admin credentials (`aws login`):

```sh
~/.claude/skills/aws-github-deploy/scripts/setup-role.sh CatalystViewer
```

The script is safe to re-run: it renders the documents, publishes a new policy version if the file changed, updates the trust policy and tags, and sets the GitHub secret and variable.

## History

- v1 (2026-04) granted Lambda, Logs, Step Functions, Scheduler, EventBridge, DynamoDB, S3 and IAM on `*`, with `iam:PassRole` unconditioned; the trust allowed `main` and `v*` tags in the classic subject form. v2 (2026-10-26) moved to the standard: scoped to the names above, `PassRole` limited by service, EventBridge and `iam:CreateServiceLinkedRole` removed (unused), trust in the immutable form for any ref.
