# migrate-issuer-financials

One-off migration script that copies all financial year data from the old `IssuerFinancials` DynamoDB table into the new single-table `IssuerProfiles` design.

For each issuer it writes two rows into `IssuerProfiles`:
- `#ANALYSIS#<iso>` — timestamped migration record containing all financial years as `agentFinancials.years[]`
- `#LATEST_ANALYSIS` — mirror row, written with `ConditionExpression: attribute_not_exists` so it won't overwrite a more recent analysis that was already stored

## Setup

1. Open `migrate-issuer-financials.ts` and fill in the `Configuration` section at the top:
   - `SOURCE_TABLE` — actual name of the `IssuerFinancials` DynamoDB table (e.g. `catalyst-viewer-int-IssuerFinancialsTable-xxxx`)
   - `TARGET_TABLE` — actual name of the `IssuerProfiles` DynamoDB table (e.g. `catalyst-viewer-int-IssuerProfilesTable-xxxx`)

2. Install dependencies:

```bash
npm install
```

## Run

```bash
# Dry run first — prints what would be written, no writes (default)
npm run migrate

# Live run — writes to IssuerProfiles
npm run migrate:live
```

AWS credentials must be available in the environment (`AWS_PROFILE` or env vars).

## After migration

Once you have verified the data is in `IssuerProfiles`, remove the `issuerFinancialsTable` block from `infra/storage.ts` and delete this script folder.
