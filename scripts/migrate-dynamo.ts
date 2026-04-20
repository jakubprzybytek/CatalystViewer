import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

type TableKey = "profiles" | "bondDetails" | "bondStatistics";

type TableDefinition = {
  displayName: string;
  suffix: string;
};

type CliOptions = {
  stage: string;
  dryRun: boolean;
  tables: TableKey[];
  oldPrefix: string;
  newPrefix: string;
  oldTableOverrides: Partial<Record<TableKey, string>>;
  newTableOverrides: Partial<Record<TableKey, string>>;
};

const REGION = "eu-west-1";
const BATCH_WRITE_SIZE = 25;
const MAX_BATCH_RETRIES = 10;
const BASE_BACKOFF_MS = 200;

const TABLE_DEFINITIONS: Record<TableKey, TableDefinition> = {
  profiles: {
    displayName: "Profiles",
    suffix: "Profiles",
  },
  bondDetails: {
    displayName: "BondDetails",
    suffix: "BondDetails",
  },
  bondStatistics: {
    displayName: "BondStatistics",
    suffix: "BondStatistics",
  },
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    stage: "dev",
    dryRun: false,
    tables: Object.keys(TABLE_DEFINITIONS) as TableKey[],
    oldPrefix: "",
    newPrefix: "",
    oldTableOverrides: {},
    newTableOverrides: {},
  };

  const args = [...argv];

  while (args.length > 0) {
    const current = args.shift();
    if (!current) {
      continue;
    }

    const [flag, inlineValue] = current.split("=", 2);
    const nextValue = () => {
      if (inlineValue !== undefined) {
        return inlineValue;
      }

      const value = args.shift();
      if (!value) {
        throw new Error(`Missing value for ${flag}`);
      }
      return value;
    };

    switch (flag) {
      case "--stage":
        options.stage = nextValue();
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--tables":
        options.tables = parseTables(nextValue());
        break;
      case "--old-prefix":
        options.oldPrefix = nextValue();
        break;
      case "--new-prefix":
        options.newPrefix = nextValue();
        break;
      case "--old-profiles-table":
        options.oldTableOverrides.profiles = nextValue();
        break;
      case "--new-profiles-table":
        options.newTableOverrides.profiles = nextValue();
        break;
      case "--old-bond-details-table":
        options.oldTableOverrides.bondDetails = nextValue();
        break;
      case "--new-bond-details-table":
        options.newTableOverrides.bondDetails = nextValue();
        break;
      case "--old-bond-statistics-table":
        options.oldTableOverrides.bondStatistics = nextValue();
        break;
      case "--new-bond-statistics-table":
        options.newTableOverrides.bondStatistics = nextValue();
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${flag}`);
    }
  }

  if (!options.oldPrefix) {
    options.oldPrefix = `catalyst-viewer-${options.stage}-BondsService-`;
  }

  if (!options.newPrefix) {
    options.newPrefix = `CatalystViewer-${options.stage}-`;
  }

  return options;
}

function parseTables(rawValue: string): TableKey[] {
  const tables = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (tables.length === 0) {
    throw new Error("--tables must include at least one table");
  }

  const parsed: TableKey[] = [];
  for (const table of tables) {
    if (!isTableKey(table)) {
      throw new Error(
        `Invalid table '${table}'. Allowed values: ${Object.keys(TABLE_DEFINITIONS).join(", ")}`,
      );
    }
    parsed.push(table);
  }

  return Array.from(new Set(parsed));
}

function isTableKey(value: string): value is TableKey {
  return value in TABLE_DEFINITIONS;
}

function resolveTableNames(options: CliOptions, key: TableKey): { oldTableName: string; newTableName: string } {
  const suffix = TABLE_DEFINITIONS[key].suffix;

  return {
    oldTableName: options.oldTableOverrides[key] ?? `${options.oldPrefix}${suffix}`,
    newTableName: options.newTableOverrides[key] ?? `${options.newPrefix}${suffix}`,
  };
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffWithJitter(attempt: number): number {
  const exponential = BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * BASE_BACKOFF_MS);
  return Math.min(exponential + jitter, 5000);
}

async function writeBatchWithRetry(
  documentClient: DynamoDBDocumentClient,
  tableName: string,
  items: Record<string, unknown>[],
): Promise<number> {
  type RequestItemsList = NonNullable<NonNullable<BatchWriteCommandInput["RequestItems"]>[string]>;

  let pendingRequests: RequestItemsList = items.map((item) => ({
    PutRequest: {
      Item: item,
    },
  })) as RequestItemsList;

  let retries = 0;

  while (pendingRequests.length > 0) {
    const response = await documentClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: pendingRequests,
        },
      }),
    );

    const unprocessed = (response.UnprocessedItems?.[tableName] ?? []) as RequestItemsList;
    if (unprocessed.length === 0) {
      return items.length;
    }

    retries += 1;
    if (retries > MAX_BATCH_RETRIES) {
      throw new Error(
        `Failed to process ${unprocessed.length} items for table '${tableName}' after ${MAX_BATCH_RETRIES} retries`,
      );
    }

    const waitMs = backoffWithJitter(retries);
    console.warn(
      `[${tableName}] Batch returned ${unprocessed.length} unprocessed items, retry ${retries}/${MAX_BATCH_RETRIES} in ${waitMs}ms`,
    );

    pendingRequests = unprocessed;
    await sleep(waitMs);
  }

  return items.length;
}

async function migrateTable(
  documentClient: DynamoDBDocumentClient,
  key: TableKey,
  options: CliOptions,
): Promise<void> {
  const tableDefinition = TABLE_DEFINITIONS[key];
  const { oldTableName, newTableName } = resolveTableNames(options, key);

  console.log(`\nMigrating ${tableDefinition.displayName}`);
  console.log(`- Source table: ${oldTableName}`);
  console.log(`- Target table: ${newTableName}`);
  console.log(`- Dry run: ${options.dryRun}`);

  let scanned = 0;
  let written = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await documentClient.send(
      new ScanCommand({
        TableName: oldTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    const items = (response.Items ?? []) as Record<string, unknown>[];
    scanned += items.length;

    if (!options.dryRun && items.length > 0) {
      const batches = chunk(items, BATCH_WRITE_SIZE);
      for (const batch of batches) {
        written += await writeBatchWithRetry(documentClient, newTableName, batch);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;

    if (options.dryRun) {
      console.log(`[${tableDefinition.displayName}] scanned ${scanned} items`);
    } else {
      console.log(`[${tableDefinition.displayName}] scanned ${scanned} items, written ${written} items`);
    }
  } while (lastEvaluatedKey !== undefined);

  if (options.dryRun) {
    console.log(`[${tableDefinition.displayName}] dry run complete. Total scanned: ${scanned}`);
  } else {
    console.log(`[${tableDefinition.displayName}] migration complete. Total scanned: ${scanned}, total written: ${written}`);
  }
}

function printHelp(): void {
  console.log(`DynamoDB migration script\n
Usage:
  tsx scripts/migrate-dynamo.ts [options]

Options:
  --stage <stage>                         Stage name (default: dev)
  --dry-run                               Scan old tables and report counts only
  --tables <profiles,bondDetails,...>     Comma-separated subset of tables
  --old-prefix <prefix>                   Source table prefix (default: catalyst-viewer-<stage>-BondsService-)
  --new-prefix <prefix>                   Target table prefix (default: CatalystViewer-<stage>-)
  --old-profiles-table <name>             Explicit source Profiles table name
  --new-profiles-table <name>             Explicit target Profiles table name
  --old-bond-details-table <name>         Explicit source BondDetails table name
  --new-bond-details-table <name>         Explicit target BondDetails table name
  --old-bond-statistics-table <name>      Explicit source BondStatistics table name
  --new-bond-statistics-table <name>      Explicit target BondStatistics table name
  -h, --help                              Show help
`);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  const dynamoClient = new DynamoDBClient({
    region: REGION,
  });

  const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  });

  console.log(`Starting migration for stage '${options.stage}' in region '${REGION}'`);

  for (const table of options.tables) {
    await migrateTable(documentClient, table, options);
  }

  console.log("\nMigration finished successfully");
}

main().catch((error) => {
  console.error("Migration failed");
  if (error instanceof Error) {
    console.error(error.message);
    console.error(error.stack);
  } else {
    console.error(error);
  }

  process.exit(1);
});
