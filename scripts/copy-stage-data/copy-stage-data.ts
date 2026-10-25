// Copies DynamoDB data from one SST stage to another (e.g. int -> prod).
// See README.md next to this file and docs/sdlc.md (migration phase 2).

import {
  BatchWriteItemCommand,
  DynamoDBClient,
  ListTablesCommand,
  ScanCommand,
  type AttributeValue,
  type WriteRequest,
} from "@aws-sdk/client-dynamodb";

const REGION = "eu-west-1";
const APP = "catalyst-viewer";

// Jobs (history) and SiteRevalidation (Next.js cache) are not copied, see docs/sdlc.md.
const DEFAULT_TABLES = ["Profiles", "BondDetails", "BondStatistics", "IssuerProfiles"];

const BATCH_SIZE = 25;
const MAX_RETRIES = 8;

type Item = Record<string, AttributeValue>;

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const from = value("from");
  const to = value("to");
  if (!from || !to) {
    throw new Error("Usage: copy-stage-data.ts --from <stage> --to <stage> [--tables A,B] [--live]");
  }
  if (from === to) {
    throw new Error("--from and --to must be different stages");
  }

  return {
    from,
    to,
    tables: value("tables")?.split(",") ?? DEFAULT_TABLES,
    live: args.includes("--live"),
  };
}

async function listAllTables(client: DynamoDBClient): Promise<string[]> {
  const names: string[] = [];
  let start: string | undefined;
  do {
    const response = await client.send(new ListTablesCommand({ ExclusiveStartTableName: start }));
    names.push(...(response.TableNames ?? []));
    start = response.LastEvaluatedTableName;
  } while (start);
  return names;
}

// SST names tables `<app>-<stage>-<Name>Table-<suffix>`.
function findTable(allTables: string[], stage: string, table: string): string {
  const prefix = `${APP}-${stage}-${table}Table-`;
  const matches = allTables.filter((name) => name.startsWith(prefix));
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one table matching '${prefix}*', found: ${JSON.stringify(matches)}`);
  }
  return matches[0];
}

// Exact count (DescribeTable's ItemCount is only refreshed every ~6 hours).
async function countItems(client: DynamoDBClient, tableName: string): Promise<number> {
  let count = 0;
  let startKey: Item | undefined;
  do {
    const response = await client.send(
      new ScanCommand({ TableName: tableName, Select: "COUNT", ExclusiveStartKey: startKey }),
    );
    count += response.Count ?? 0;
    startKey = response.LastEvaluatedKey;
  } while (startKey);
  return count;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function writeBatch(client: DynamoDBClient, tableName: string, items: Item[]): Promise<void> {
  let requests: WriteRequest[] = items.map((item) => ({ PutRequest: { Item: item } }));

  for (let attempt = 0; requests.length > 0; attempt++) {
    if (attempt > MAX_RETRIES) {
      throw new Error(`${requests.length} items still unprocessed in ${tableName} after ${MAX_RETRIES} retries`);
    }
    if (attempt > 0) {
      await sleep(Math.min(100 * 2 ** attempt, 5000));
    }
    const response = await client.send(new BatchWriteItemCommand({ RequestItems: { [tableName]: requests } }));
    requests = response.UnprocessedItems?.[tableName] ?? [];
  }
}

async function copyTable(client: DynamoDBClient, source: string, target: string): Promise<number> {
  let copied = 0;
  let startKey: Item | undefined;
  do {
    const response = await client.send(new ScanCommand({ TableName: source, ExclusiveStartKey: startKey }));
    const items = response.Items ?? [];
    for (let index = 0; index < items.length; index += BATCH_SIZE) {
      await writeBatch(client, target, items.slice(index, index + BATCH_SIZE));
      copied += Math.min(BATCH_SIZE, items.length - index);
    }
    startKey = response.LastEvaluatedKey;
    process.stdout.write(`\r  copied ${copied}`);
  } while (startKey);
  process.stdout.write("\n");
  return copied;
}

async function main() {
  const { from, to, tables, live } = parseArgs();
  const client = new DynamoDBClient({ region: REGION });
  const allTables = await listAllTables(client);

  console.log(`${live ? "LIVE" : "DRY RUN"}: copy ${tables.join(", ")} from '${from}' to '${to}'\n`);

  // Resolve and check everything before writing anything.
  const plan = [];
  for (const table of tables) {
    const source = findTable(allTables, from, table);
    const target = findTable(allTables, to, table);
    const sourceCount = await countItems(client, source);
    const targetCount = await countItems(client, target);
    console.log(`${table}: ${source} (${sourceCount} items) -> ${target} (${targetCount} items)`);
    plan.push({ table, source, target, sourceCount, targetCount });
  }

  const notEmpty = plan.filter((entry) => entry.targetCount > 0);
  if (notEmpty.length > 0) {
    throw new Error(`Target tables are not empty: ${notEmpty.map((entry) => entry.target).join(", ")}`);
  }

  if (!live) {
    console.log("\nDry run only. Add --live to copy.");
    return;
  }

  let mismatches = 0;
  for (const { table, source, target, sourceCount } of plan) {
    console.log(`\n${table}`);
    const copied = await copyTable(client, source, target);
    const targetCount = await countItems(client, target);
    const ok = targetCount === sourceCount && copied === sourceCount;
    if (!ok) mismatches++;
    console.log(`  source ${sourceCount}, copied ${copied}, target now ${targetCount} ${ok ? "OK" : "MISMATCH"}`);
  }

  if (mismatches > 0) {
    throw new Error(`${mismatches} table(s) don't match. Was the source written to during the copy?`);
  }
  console.log("\nAll tables copied and counts match.");
}

main().catch((error) => {
  console.error("\nCopy failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
