import { profilesTable, bondDetailsTable, bondStatisticsTable, issuerProfilesTable, jobsTable } from "./storage";
import { accessGroups, isProd, TEST_USER } from "./stage";

// Shared, manually managed pool (AlbedoUserPool) used by several apps. Each stage gets its own app client.
const USER_POOL_ID = "eu-west-1_IVai0KEAA";

const userPoolClient = new aws.cognito.UserPoolClient("WebClient", {
  name: `catalyst-viewer-${$app.stage}-web`,
  userPoolId: USER_POOL_ID,
  // Plain-password sign-in (API tests without a browser) only off prod.
  explicitAuthFlows: ["ALLOW_REFRESH_TOKEN_AUTH", "ALLOW_USER_SRP_AUTH", ...(isProd ? [] : ["ALLOW_USER_PASSWORD_AUTH"])],
  generateSecret: false,
  preventUserExistenceErrors: "ENABLED",
  enableTokenRevocation: true,
  accessTokenValidity: 60,
  idTokenValidity: 60,
  refreshTokenValidity: 30,
  tokenValidityUnits: { accessToken: "minutes", idToken: "minutes", refreshToken: "days" },
});

// Test user (docs/development.md): read by the smoke tests through `sst shell`. Not on prod, where its group is rejected.
if (!isProd) {
  new sst.Secret("TestUserPassword");
  new sst.Linkable("TestUser", { properties: { email: TEST_USER, clientId: userPoolClient.id } });
}

// API functions: the handler wrapper (HandlerProxy) lets in only users in one of ACCESS_GROUPS.
type ApiFunctionArgs = Omit<sst.aws.FunctionArgs, "environment"> & { environment?: Record<string, $util.Input<string>> };
const apiFunction = (name: string, args: ApiFunctionArgs) =>
  new sst.aws.Function(name, { ...args, environment: { ...args.environment, ACCESS_GROUPS: accessGroups.join(",") } });

const getProfileFunction = apiFunction("GetProfile", {
  handler: "packages/functions/src/profile/getProfile.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [profilesTable],
});

const updateProfileFunction = apiFunction("UpdateProfile", {
  handler: "packages/functions/src/profile/updateProfile.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [profilesTable],
});

const getBondsFunction = apiFunction("GetBonds", {
  handler: "packages/functions/src/bonds/getBondReports.handler",
  memory: "256 MB",
  timeout: "60 seconds",
  link: [bondDetailsTable],
});

const getBondQuotesFunction = apiFunction("GetBondQuotes", {
  handler: "packages/functions/src/bonds/getBondQuotes.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [bondStatisticsTable],
});

const getIssuerProfilesFunction = apiFunction("GetIssuerProfiles", {
  handler: "packages/functions/src/issuers/getIssuerProfiles.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerProfilesTable],
});

const getIssuerAnalysisFunction = apiFunction("GetIssuerAnalysis", {
  handler: "packages/functions/src/issuers/getIssuerAnalysis.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [issuerProfilesTable],
});

const fundamentalAnalysisStateMachineArn = $interpolate`arn:aws:states:eu-west-1:198805281865:stateMachine:FundamentalAnalysisStateMachine-${$app.stage}`;

const triggerFundamentalAnalysisFunction = apiFunction("TriggerFundamentalAnalysis", {
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

const triggerBondsUpdaterFunction = apiFunction("TriggerBondsUpdater", {
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

const getJobsFunction = apiFunction("GetJobs", {
  handler: "packages/functions/src/jobs/getJobs.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [jobsTable],
});

const getJobFunction = apiFunction("GetJob", {
  handler: "packages/functions/src/jobs/getJob.handler",
  memory: "256 MB",
  timeout: "10 seconds",
  link: [jobsTable],
});

const getCatalystDailyStatsFunction = apiFunction("GetCatalystDailyStats", {
  handler: "packages/functions/src/bonds/getCatalystDailyStats.handler",
  memory: "256 MB",
  timeout: "60 seconds",
  environment: {
    TEMP_FOLDER: "/tmp",
  },
});

const getBondInformationFunction = apiFunction("GetBondInformation", {
  handler: "packages/functions/src/bonds/getBondInformation.handler",
  memory: "256 MB",
  timeout: "60 seconds",
});

export const api = new sst.aws.ApiGatewayV2("Api");

const cognitoAuthorizer = api.addAuthorizer({
  name: "cognitoAuthorizer",
  jwt: {
    issuer: `https://cognito-idp.eu-west-1.amazonaws.com/${USER_POOL_ID}`,
    audiences: [userPoolClient.id],
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
export const userPoolClientId = userPoolClient.id;
