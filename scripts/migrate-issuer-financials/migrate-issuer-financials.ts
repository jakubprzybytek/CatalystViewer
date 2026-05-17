import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";

// ─── Configuration ────────────────────────────────────────────────────────────
// Fill in the table names before running.
//
// How to run:
//   npm install
//   npm run migrate       # dry run (default) — prints what would be written, no writes
//   npm run migrate:live  # live run — writes to IssuerProfiles table
//
// AWS credentials must be available (AWS_PROFILE or env vars).
//
// Find actual table names in the AWS console or from `sst dev` output.

const REGION = "eu-west-1";
const SOURCE_TABLE = "replace-with-actual-IssuerFinancials-table-name";
const TARGET_TABLE = "replace-with-actual-IssuerProfiles-table-name";

// ─── Types ────────────────────────────────────────────────────────────────────

type FinancialYearRow = {
  issuerName: string;
  year: number;
  revenue?: number;
  ebit?: number;
  depreciation?: number;
  interestExpense?: number;
  netProfit?: number;
  totalAssets?: number;
  intangibleAssets?: number;
  equity?: number;
  financialDebt?: number;
  cash?: number;
  currentAssets?: number;
  inventory?: number;
  currentLiabilities?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function scanAll(
  docClient: DynamoDBDocumentClient,
  tableName: string,
): Promise<FinancialYearRow[]> {
  const items: FinancialYearRow[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const params: ScanCommandInput = { TableName: tableName };
    if (lastKey) params.ExclusiveStartKey = lastKey;

    const response = await docClient.send(new ScanCommand(params));
    if (response.Items) {
      items.push(...(response.Items as FinancialYearRow[]));
    }
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function run(dryRun: boolean): Promise<void> {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE (will write to IssuerProfiles)"}\n`);
  console.log(`Source: ${SOURCE_TABLE}`);
  console.log(`Target: ${TARGET_TABLE}\n`);

  const dynamoClient = new DynamoDBClient({ region: REGION });
  const docClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  // Scan all rows from the old IssuerFinancials table
  console.log("Scanning source table...");
  const allRows = await scanAll(docClient, SOURCE_TABLE);
  console.log(`Found ${allRows.length} financial year row(s)\n`);

  if (allRows.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  // Group years by issuerName
  const byIssuer = new Map<string, FinancialYearRow[]>();
  for (const row of allRows) {
    const existing = byIssuer.get(row.issuerName) ?? [];
    existing.push(row);
    byIssuer.set(row.issuerName, existing);
  }

  console.log(`Found ${byIssuer.size} unique issuer(s)\n`);

  const migrationTs = Date.now();
  const migrationIso = new Date(migrationTs).toISOString();
  let migrated = 0;
  let skipped = 0;

  for (const [issuerName, years] of byIssuer) {
    // Sort years descending for display
    const sortedYears = [...years].sort((a, b) => b.year - a.year);
    const yearList = sortedYears.map((y) => y.year).join(", ");

    console.log(`  ${issuerName}  (years: ${yearList})`);

    if (dryRun) {
      console.log(`    → [DRY RUN] Would write #ANALYSIS#${migrationIso} + #LATEST_ANALYSIS`);
      skipped++;
      continue;
    }

    const baseRecord = {
      issuerName,
      performedAt: migrationIso,
      performedAtTs: migrationTs,
      modelId: "manual-migration-v1",
      agentFinancials: { years: sortedYears },
    };

    // Write timestamped analysis row
    await docClient.send(
      new PutCommand({
        TableName: TARGET_TABLE,
        Item: {
          ...baseRecord,
          recordType: `#ANALYSIS#${migrationIso}`,
        },
      }),
    );

    // Write #LATEST_ANALYSIS mirror row
    await docClient.send(
      new PutCommand({
        TableName: TARGET_TABLE,
        Item: {
          ...baseRecord,
          recordType: "#LATEST_ANALYSIS",
        },
        // Only write if no newer analysis exists for this issuer
        ConditionExpression: "attribute_not_exists(issuerName)",
      }),
    );

    console.log(`    ✓ Written`);
    migrated++;
  }

  console.log(`\nDone. ${dryRun ? `${skipped} issuer(s) would be migrated.` : `${migrated} issuer(s) migrated.`}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const dryRun = !process.argv.includes("--live");

run(dryRun).catch((error) => {
  console.error("Script failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
