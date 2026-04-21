import { profilesTable, bondDetailsTable, bondStatisticsTable } from "./storage";

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

export const userPoolId = USER_POOL_ID;
export const userPoolClientId = USER_POOL_CLIENT_ID;
