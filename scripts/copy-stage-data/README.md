# Copy stage data

Copies DynamoDB tables from one SST stage to another, e.g. `int` → `prod` (used for the prod cutover on 2026-10-25).

- Finds the tables by stage (`catalyst-viewer-<stage>-<Name>Table-*`).
- Copies items as raw DynamoDB attribute values, so nothing is converted on the way.
- Retries unprocessed batch writes; fails instead of silently dropping items.
- Refuses to write into a target table that isn't empty.
- Dry run by default. Compares exact item counts after copying.

Default tables: `Profiles`, `BondDetails`, `BondStatistics`, `IssuerProfiles` (not `Jobs`, not `SiteRevalidation`).

## Run

From the repository root, with AWS credentials for the account:

```bash
# dry run: shows tables and item counts
npx tsx scripts/copy-stage-data/copy-stage-data.ts --from int --to prod

# copy
npx tsx scripts/copy-stage-data/copy-stage-data.ts --from int --to prod --live

# only some tables
npx tsx scripts/copy-stage-data/copy-stage-data.ts --from int --to prod --tables BondDetails,BondStatistics --live
```

Make sure nothing writes to the source tables while copying (pause the Bonds Updater schedule), otherwise counts won't match.
