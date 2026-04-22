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
