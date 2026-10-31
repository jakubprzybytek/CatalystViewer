export const profilesTable = new sst.aws.Dynamo("Profiles", {
  fields: {
    userName: "string",
  },
  primaryIndex: {
    hashKey: "userName",
  },
});

export const bondDetailsTable = new sst.aws.Dynamo("BondDetails", {
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
export const filingsBucket = new sst.aws.Bucket("Filings");
