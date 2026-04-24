import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// ─── Configuration ────────────────────────────────────────────────────────────
// Set TABLE_NAME to the target BondDetails table before running.
//
// How to run:
//   npm install
//   npm run fix              # live run — writes changes to DynamoDB
//   npm run fix:dry          # dry run — scans and reports, makes no changes
//
// AWS credentials must be available in the environment (AWS_PROFILE or env vars).

const REGION = "eu-west-1";
const TABLE_NAME = "catalyst-viewer-int-BondDetailsTable-naxwuwws"; // ← replace with actual table name

// ─── Fields to convert from SS (Set) → L (List) ──────────────────────────────
// String date fields — sorted ascending (ISO date strings sort lexicographically).
const STRING_SET_FIELDS = [
  "interestFirstDays",
  "interestRightsDays",
  "interestPayoffDays",
] as const;

// Numeric timestamp fields — stored in DynamoDB SS as stringified numbers,
// sorted ascending numerically.
const NUMBER_SET_FIELDS = [
  "interestFirstDayTss",
  "interestRightsDayTss",
  "interestPayoffDayTss",
] as const;

const ALL_SET_FIELDS = [...STRING_SET_FIELDS, ...NUMBER_SET_FIELDS];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set;
}

/**
 * Determines whether an item has any SS fields that need converting.
 * The DocumentClient unmarshals SS → Set, and L → Array, so we check for Set.
 */
function needsFixing(item: Record<string, unknown>): boolean {
  return ALL_SET_FIELDS.some((field) => isSet(item[field]));
}

/**
 * Builds the sorted array value to store for a given field.
 * Numeric timestamp fields are sorted numerically; string date fields
 * sort correctly as ISO strings lexicographically.
 */
function toSortedArray(field: string, value: Set<unknown>): (string | number)[] {
  if ((NUMBER_SET_FIELDS as readonly string[]).includes(field)) {
    return [...value].map(Number).sort((a, b) => a - b);
  }
  return [...value].map(String).sort();
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function fixItem(
  client: DynamoDBDocumentClient,
  item: Record<string, unknown>,
  dryRun: boolean,
): Promise<void> {
  const fieldsToFix = ALL_SET_FIELDS.filter((field) => isSet(item[field]));

  const expressionParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  for (const field of fieldsToFix) {
    const alias = `#${field}`;
    const valueAlias = `:${field}`;
    expressionParts.push(`${alias} = ${valueAlias}`);
    expressionAttributeNames[alias] = field;
    expressionAttributeValues[valueAlias] = toSortedArray(field, item[field] as Set<unknown>);
  }

  const bondType = item["bondType"] as string;
  const nameMarket = item["name#market"] as string;

  console.log(
    `  ${dryRun ? "[DRY RUN] Would fix" : "Fixing"} ${nameMarket} — fields: ${fieldsToFix.join(", ")}`,
  );

  if (dryRun) return;

  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        "bondType": bondType,
        "name#market": nameMarket,
      },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}

async function run(dryRun: boolean): Promise<void> {
  const dynamoClient = new DynamoDBClient({ region: REGION });
  const client = DynamoDBDocumentClient.from(dynamoClient, {
    unmarshallOptions: { wrapNumbers: false },
  });

  console.log(`Table:   ${TABLE_NAME}`);
  console.log(`Region:  ${REGION}`);
  console.log(`Mode:    ${dryRun ? "DRY RUN (no writes)" : "LIVE (will update items)"}\n`);

  let scanned = 0;
  let fixed = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastEvaluatedKey }),
    );

    const items = (response.Items ?? []) as Record<string, unknown>[];
    scanned += items.length;

    for (const item of items) {
      if (needsFixing(item)) {
        await fixItem(client, item, dryRun);
        fixed++;
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    console.log(`Scanned: ${scanned}, ${dryRun ? "would fix" : "fixed"}: ${fixed}`);
  } while (lastEvaluatedKey !== undefined);

  console.log(`\nDone. Total scanned: ${scanned}, ${dryRun ? "would fix" : "fixed"}: ${fixed}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const dryRun = process.argv.includes("--dry-run");

run(dryRun).catch((error) => {
  console.error("Script failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
