import { api, userPoolId, userPoolClientId } from "./api";

// const customDomainPrefix = $app.stage === "int" ? "" : $app.stage + ".";
const customDomainPrefix = $app.stage + ".";

const site = new sst.aws.Nextjs("Site", {
  path: "packages/web",
  openNextVersion: "3.10.2",
  domain: {
    name: customDomainPrefix + "catalyst.albedoonline.com",
    dns: sst.aws.dns({ zone: "Z041419132FCBY6ZLLXL2" }),
  },
  environment: {
    NEXT_PUBLIC_AWS_REGION: "eu-west-1",
    NEXT_PUBLIC_API_URL: api.url,
    NEXT_PUBLIC_USER_POOL_ID: userPoolId,
    NEXT_PUBLIC_USER_POOL_CLIENT_ID: userPoolClientId,
  },
});

export const outputs = {
  siteUrl: site.url,
  apiUrl: api.url,
};
