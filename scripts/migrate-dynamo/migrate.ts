import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";

// ─── Configuration ────────────────────────────────────────────────────────────
// Fill in the source and target table names before running.

const REGION = "eu-west-1";

const TABLES: { source: string; target: string }[] = [
  {
    source: "int-catalyst-viewer-Profiles",
    target: "catalyst-viewer-int-ProfilesTable-zazfbood",
  },
  {
    source: "int-catalyst-viewer-BondDetails",
    target: "catalyst-viewer-int-BondDetailsTable-naxwuwws",
  },
  {
    source: "int-catalyst-viewer-BondStatistics",
    target: "catalyst-viewer-int-BondStatisticsTable-rzunkuck",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_WRITE_SIZE = 25;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

// ─── Validation ──────────────────────────────────────────────────────────────

async function validateTables(
  dynamoClient: DynamoDBClient,
  client: DynamoDBDocumentClient,
  tables: { source: string; target: string }[],
): Promise<void> {
  console.log("Validating tables...");
  const errors: string[] = [];

  for (const { source, target } of tables) {
    let sourceExists = true;
    let targetExists = true;

    for (const [tableName, exists] of [[source, sourceExists], [target, targetExists]] as [string, boolean][]) {
      try {
        await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      } catch {
        errors.push(`Table does not exist: '${tableName}'`);
        if (tableName === source) sourceExists = false;
        if (tableName === target) targetExists = false;
      }
    }

    if (targetExists) {
      const response = await client.send(
        new ScanCommand({ TableName: target, Select: "COUNT", Limit: 1 }),
      );
      if ((response.Count ?? 0) > 0) {
        errors.push(`Target table is not empty: '${target}'`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }

  console.log("Validation passed.");
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function writeBatch(
  client: DynamoDBDocumentClient,
  tableName: string,
  items: Record<string, unknown>[],
): Promise<number> {
  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: items.map((item) => ({ PutRequest: { Item: item } })),
      },
    }),
  );
  return items.length;
}

async function migrateTable(
  client: DynamoDBDocumentClient,
  source: string,
  target: string,
): Promise<void> {
  console.log(`\nMigrating: ${source} → ${target}`);

  let scanned = 0;
  let written = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await client.send(
      new ScanCommand({ TableName: source, ExclusiveStartKey: lastEvaluatedKey }),
    );

    const items = (response.Items ?? []) as Record<string, unknown>[];
    scanned += items.length;

    for (const batch of chunk(items, BATCH_WRITE_SIZE)) {
      written += await writeBatch(client, target, batch);
    }

    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
    console.log(`  scanned ${scanned}, written ${written}`);
  } while (lastEvaluatedKey !== undefined);

  console.log(`  Done. Total: scanned ${scanned}, written ${written}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const dynamoClient = new DynamoDBClient({ region: REGION });
  const client = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  console.log(`Starting migration (region: ${REGION})`);

  await validateTables(dynamoClient, client, TABLES);

  for (const { source, target } of TABLES) {
    await migrateTable(client, source, target);
  }

  console.log("\nMigration finished successfully");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
