import { profilesTable, bondDetailsTable, bondStatisticsTable, issuerProfilesTable, jobsTable } from "./storage";

const USER_POOL_ID = "eu-west-1_IVai0KEAA";
const USER_POOL_CLIENT_ID = "3qt6td581r3qqsk23tgv9r5duh";

const getProfileFunction = new sst.aws.Function("GetProfile", {
  handler: "packages/functions/src/profile/getProfile.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [profilesTable],
});

const updateProfileFunction = new sst.aws.Function("UpdateProfile", {
  handler: "packages/functions/src/profile/updateProfile.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [profilesTable],
});

const getBondsFunction = new sst.aws.Function("GetBonds", {
  handler: "packages/functions/src/bonds/getBondReports.handler",
  memory: "256 MB",
  timeout: "60 seconds",
  link: [bondDetailsTable],
});

const getBondQuotesFunction = new sst.aws.Function("GetBondQuotes", {
  handler: "packages/functions/src/bonds/getBondQuotes.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [bondStatisticsTable],
});

const getIssuerProfilesFunction = new sst.aws.Function("GetIssuerProfiles", {
  handler: "packages/functions/src/issuers/getIssuerProfiles.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerProfilesTable],
});

const getIssuerAnalysisFunction = new sst.aws.Function("GetIssuerAnalysis", {
  handler: "packages/functions/src/issuers/getIssuerAnalysis.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerProfilesTable],
});

const fundamentalAnalysisStateMachineArn = $interpolate`arn:aws:states:eu-west-1:198805281865:stateMachine:FundamentalAnalysisStateMachine-${$app.stage}`;

const triggerFundamentalAnalysisFunction = new sst.aws.Function("TriggerFundamentalAnalysis", {
  handler: "packages/functions/src/issuers/triggerFundamentalAnalysis.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  environment: {
    FUNDAMENTAL_ANALYSIS_STATE_MACHINE_ARN: fundamentalAnalysisStateMachineArn,
  },
  permissions: [
    {
      actions: ["states:StartExecution"],
      resources: [fundamentalAnalysisStateMachineArn],
    },
  ],
});

const bondsUpdaterStateMachineArn = $interpolate`arn:aws:states:eu-west-1:198805281865:stateMachine:BondsUpdaterStateMachine-${$app.stage}`;

const triggerBondsUpdaterFunction = new sst.aws.Function("TriggerBondsUpdater", {
  handler: "packages/functions/src/bonds/triggerBondsUpdater.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  environment: {
    BONDS_UPDATER_STATE_MACHINE_ARN: bondsUpdaterStateMachineArn,
  },
  permissions: [
    {
      actions: ["states:StartExecution"],
      resources: [bondsUpdaterStateMachineArn],
    },
  ],
});

const getJobsFunction = new sst.aws.Function("GetJobs", {
  handler: "packages/functions/src/jobs/getJobs.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [jobsTable],
});

const getJobFunction = new sst.aws.Function("GetJob", {
  handler: "packages/functions/src/jobs/getJob.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [jobsTable],
});

const getCatalystDailyStatsFunction = new sst.aws.Function("GetCatalystDailyStats", {
  handler: "packages/functions/src/bonds/getCatalystDailyStats.handler",
  memory: "256 MB",
  timeout: "60 seconds",
  environment: {
    TEMP_FOLDER: "/tmp",
  },
});

const getBondInformationFunction = new sst.aws.Function("GetBondInformation", {
  handler: "packages/functions/src/bonds/getBondInformation.handler",
  memory: "256 MB",
  timeout: "60 seconds",
});

export const api = new sst.aws.ApiGatewayV2("Api");

const cognitoAuthorizer = api.addAuthorizer({
  name: "cognitoAuthorizer",
  jwt: {
    issuer: `https://cognito-idp.eu-west-1.amazonaws.com/${USER_POOL_ID}`,
    audiences: [USER_POOL_CLIENT_ID],
  },
});

const jwtAuth = {
  auth: {
    jwt: {
      authorizer: cognitoAuthorizer.id,
    },
  },
};

api.route("GET /api/profile", getProfileFunction.arn, jwtAuth);
api.route("PUT /api/profile", updateProfileFunction.arn, jwtAuth);
api.route("GET /api/bonds", getBondsFunction.arn, jwtAuth);
api.route("GET /api/bonds/{bondType}", getBondsFunction.arn, jwtAuth);
api.route("GET /api/bondQuotes", getBondQuotesFunction.arn, jwtAuth);
api.route("GET /api/issuers/profiles", getIssuerProfilesFunction.arn, jwtAuth);
api.route("GET /api/issuers/{name}/analysis", getIssuerAnalysisFunction.arn, jwtAuth);
api.route("POST /api/issuers/{name}/analysis/trigger", triggerFundamentalAnalysisFunction.arn, jwtAuth);
api.route("GET /api/jobs", getJobsFunction.arn, jwtAuth);
api.route("GET /api/jobs/{jobId}", getJobFunction.arn, jwtAuth);
api.route("GET /api/tools/dailyStats", getCatalystDailyStatsFunction.arn, jwtAuth);
api.route("GET /api/tools/bondInformation", getBondInformationFunction.arn, jwtAuth);
api.route("POST /api/tools/bondsUpdater", triggerBondsUpdaterFunction.arn, jwtAuth);

export const userPoolId = USER_POOL_ID;
export const userPoolClientId = USER_POOL_CLIENT_ID;
