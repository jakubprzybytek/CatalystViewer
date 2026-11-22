import { isProd } from "./stage";

// On prod a table can't be deleted (by a deploy, the console or the API) until its deletion protection is turned off
// (agent-playbook aws-app-guidelines). Turn it off first when the app is decommissioned.
const deletionProtection = isProd;

export const profilesTable = new sst.aws.Dynamo("Profiles", {
  deletionProtection,
  fields: {
    userName: "string",
  },
  primaryIndex: {
    hashKey: "userName",
  },
});

export const bondDetailsTable = new sst.aws.Dynamo("BondDetails", {
  deletionProtection,
  fields: {
    bondType: "string",
    "name#market": "string",
  },
  primaryIndex: {
    hashKey: "bondType",
    rangeKey: "name#market",
  },
});

export const bondStatisticsTable = new sst.aws.Dynamo("BondStatistics", {
  deletionProtection,
  fields: {
    "name#market": "string",
    "year#month": "string",
  },
  primaryIndex: {
    hashKey: "name#market",
    rangeKey: "year#month",
  },
});

export const issuerProfilesTable = new sst.aws.Dynamo("IssuerProfiles", {
  deletionProtection,
  fields: {
    issuerName: "string",
    recordType: "string",
  },
  primaryIndex: {
    hashKey: "issuerName",
    rangeKey: "recordType",
  },
});

export const jobsTable = new sst.aws.Dynamo("Jobs", {
  deletionProtection,
  fields: {
    listPk: "string",
    listSk: "number",
    statusPk: "string",
    jobId: "string",
    executionArn: "string",
  },
  primaryIndex: {
    hashKey: "listPk",
    rangeKey: "listSk",
  },
  globalIndexes: {
    statusPkListSkIndex: {
      hashKey: "statusPk",
      rangeKey: "listSk",
    },
    jobIdIndex: {
      hashKey: "jobId",
    },
    executionArnIndex: {
      hashKey: "executionArn",
    },
  },
});

// Issuers' financials read from their filed annual statements (KRS XML, ESEF, IFRS reports), one row
// per company, fiscal year and scope; see packages/core/src/storage/issuerFinancials. Filled by `npm run import-filing`.
export const issuerFinancialsTable = new sst.aws.Dynamo("IssuerFinancials", {
  deletionProtection,
  fields: {
    entityId: "string",
    period: "string",
  },
  primaryIndex: {
    hashKey: "entityId",
    rangeKey: "period",
  },
});

// Original filing documents (XML, ESEF zip, XHTML), keyed filings/<entityId>/<periodEnd>-<scope>-<sha256 prefix>.<ext>. Private.
// Versioned on prod: an overwritten or deleted original can be got back for 30 days.
export const filingsBucket = new sst.aws.Bucket("Filings", { versioning: isProd });
if (isProd) {
  new aws.s3.BucketLifecycleConfiguration("FilingsLifecycle", {
    bucket: filingsBucket.name,
    rules: [{ id: "old-versions", status: "Enabled", filter: {}, noncurrentVersionExpiration: { noncurrentDays: 30 }, expiration: { expiredObjectDeleteMarker: true } }],
  }, { dependsOn: [filingsBucket] });
}
