// Resets a test stage (int, or dev) to the fixture data and runs the Bonds Updater on the fixture sources.
// Run inside `sst shell` (continuous-delivery.yaml does this after deploying int):
//
//   npx sst shell --stage int -- npx esrun scripts/seed-int/seed-int.ts
//
// 1. empties the app's tables (bonds, quotes history, issuers, jobs, user profiles);
// 2. writes tests/fixtures/db/<Table>.json (raw DynamoDB items);
// 3. starts the Bonds Updater (Resource.BondsUpdaterWorkflow) and waits for it to succeed (skip with --no-update).
// See docs/testing.md.

import { readFileSync } from "fs";
import {
  BatchWriteItemCommand,
  DynamoDBClient,
  ScanCommand,
  type AttributeValue,
  type WriteRequest,
} from "@aws-sdk/client-dynamodb";
import { DescribeExecutionCommand, SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";

const REGION = "eu-west-1";
const TEST_STAGES = ["int", "dev"];
const BATCH_SIZE = 25;
const MAX_RETRIES = 8;
const UPDATER_TIMEOUT_MS = 10 * 60 * 1000;

type Item = Record<string, AttributeValue>;

// Linked table resources and their key attributes (infra/storage.ts).
const TABLES: { name: "BondDetails" | "BondStatistics" | "IssuerProfiles" | "Jobs" | "Profiles"; keys: string[] }[] = [
  { name: "BondDetails", keys: ["bondType", "name#market"] },
  { name: "BondStatistics", keys: ["name#market", "year#month"] },
  { name: "IssuerProfiles", keys: ["issuerName", "recordType"] },
  { name: "Jobs", keys: ["listPk", "listSk"] },
  { name: "Profiles", keys: ["userName"] },
];

const dynamo = new DynamoDBClient({ region: REGION });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function scanAll(tableName: string, keys: string[]): Promise<Item[]> {
  const items: Item[] = [];
  let startKey: Item | undefined;
  do {
    const response = await dynamo.send(new ScanCommand({
      TableName: tableName,
      ProjectionExpression: keys.map((_, i) => `#k${i}`).join(", "),
      ExpressionAttributeNames: Object.fromEntries(keys.map((key, i) => [`#k${i}`, key])),
      ExclusiveStartKey: startKey,
    }));
    items.push(...(response.Items ?? []));
    startKey = response.LastEvaluatedKey;
  } while (startKey);
  return items;
}

// Batch writes, retrying unprocessed items; fails instead of silently dropping any.
async function batchWrite(tableName: string, requests: WriteRequest[]): Promise<void> {
  for (let i = 0; i < requests.length; i += BATCH_SIZE) {
    let pending = requests.slice(i, i + BATCH_SIZE);
    for (let attempt = 0; pending.length > 0; attempt++) {
      if (attempt > MAX_RETRIES) throw new Error(`${tableName}: ${pending.length} writes still unprocessed`);
      if (attempt > 0) await sleep(100 * 2 ** attempt);
      const response = await dynamo.send(new BatchWriteItemCommand({ RequestItems: { [tableName]: pending } }));
      pending = response.UnprocessedItems?.[tableName] ?? [];
    }
  }
}

function fixtureItems(table: string): Item[] {
  try {
    return JSON.parse(readFileSync(`tests/fixtures/db/${table}.json`, "utf-8")) as Item[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function resetTables(): Promise<void> {
  for (const { name, keys } of TABLES) {
    const tableName = Resource[name].name;
    const existing = await scanAll(tableName, keys);
    await batchWrite(tableName, existing.map((Key) => ({ DeleteRequest: { Key } })));

    const items = fixtureItems(name);
    await batchWrite(tableName, items.map((Item) => ({ PutRequest: { Item } })));
    console.log(`${name}: deleted ${existing.length}, wrote ${items.length}`);
  }
}

async function runBondsUpdater(): Promise<void> {
  const stateMachineArn = Resource.BondsUpdaterWorkflow.arn;
  const sfn = new SFNClient({ region: REGION });

  const { executionArn } = await sfn.send(new StartExecutionCommand({
    stateMachineArn,
    name: `seed-${Date.now()}`,
    input: "{}",
  }));
  console.log(`Bonds Updater started: ${executionArn}`);

  const deadline = Date.now() + UPDATER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(5000);
    const execution = await sfn.send(new DescribeExecutionCommand({ executionArn }));
    if (execution.status === "RUNNING") continue;
    if (execution.status !== "SUCCEEDED") {
      throw new Error(`Bonds Updater ${execution.status}: ${execution.error ?? ""} ${execution.cause ?? ""}`);
    }
    console.log(`Bonds Updater succeeded: ${execution.output}`);
    return;
  }
  throw new Error(`Bonds Updater still running after ${UPDATER_TIMEOUT_MS / 60000} minutes`);
}

async function main() {
  const stage = Resource.App.stage;
  if (!TEST_STAGES.includes(stage)) {
    throw new Error(`Refusing to reset stage '${stage}': only ${TEST_STAGES.join(", ")}`);
  }

  await resetTables();
  if (!process.argv.includes("--no-update")) {
    await runBondsUpdater();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
