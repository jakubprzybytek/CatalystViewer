import { api, userPoolId, userPoolClientId } from "./api";
import { isProd, siteDomain } from "./stage";

const site = new sst.aws.Nextjs("Site", {
  path: "packages/web",
  openNextVersion: "3.10.2",
  domain: {
    name: siteDomain,
    // prod takes over records left in the zone by an earlier deployment of the bare domain (e.g. ACM validation CNAME)
    dns: sst.aws.dns({ zone: "Z041419132FCBY6ZLLXL2", override: isProd }),
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
