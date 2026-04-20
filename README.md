### Development

#### SST
```
npm run dev
```

#### Next.js web app:
```
cd packages/web
npm run dev
```

### Catalyst CLI
* `npm run quote -- FPC0631` - Get a quote for a bond

### DynamoDB migration (SST v2 -> SST v4)
Use the migration script to copy data from old SST v2 DynamoDB tables to new SST v4 tables.

```bash
npm run migrate -- --stage prod
```

Dry run (scan/count only):

```bash
npm run migrate -- --stage prod --dry-run
```

Migrate only selected tables:

```bash
npm run migrate -- --stage prod --tables profiles,bondDetails
```

Override prefixes or explicit table names when needed:

```bash
npm run migrate -- --stage prod \
  --old-prefix catalyst-viewer-prod-BondsService- \
  --new-prefix CatalystViewer-prod-
```

```bash
npm run migrate -- --stage prod \
  --old-profiles-table catalyst-viewer-prod-BondsService-Profiles \
  --new-profiles-table CatalystViewer-prod-Profiles
```
