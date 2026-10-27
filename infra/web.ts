import { api, userPoolId, userPoolClientId } from "./api";
import { isProd, referenceDate, siteDomain } from "./stage";

const openNextVersion = "3.10.2";

const site = new sst.aws.Nextjs("Site", {
  path: "packages/web",
  openNextVersion,
  // Deploys from Windows: replace the package symlinks Next.js leaves in the build (scripts/site-build/windows-links.mjs).
  ...(process.platform === "win32"
    ? { buildCommand: `npx --yes @opennextjs/aws@${openNextVersion} build &&node ../../scripts/site-build/windows-links.mjs` }
    : {}),
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
    // the release (vM.N) or <ref>-<sha> the pipeline deploys; "local" for deploys from a machine
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || "local",
    // int: yields and interest progress at the fixtures' reference date (packages/web/src/common/Clock.ts)
    ...(referenceDate ? { NEXT_PUBLIC_REFERENCE_DATE: referenceDate } : {}),
  },
});

export const outputs = {
  siteUrl: site.url,
  apiUrl: api.url,
};
