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

// Keep this table defined so SST does not delete it during deploy.
// Run scripts/migrate-issuer-financials to copy data to IssuerProfiles, then remove this block.
export const issuerFinancialsTable = new sst.aws.Dynamo("IssuerFinancials", {
  fields: {
    issuerName: "string",
    year: "number",
  },
  primaryIndex: {
    hashKey: "issuerName",
    rangeKey: "year",
  },
});
