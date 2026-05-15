import { readFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// ─── Configuration ────────────────────────────────────────────────────────────
// Fill in the values below before running.
//
// How to run:
//   npm install
//   npm run store       # dry run (default) — no writes
//   npm run store:live  # live run — stores records into DynamoDB
//
// AWS credentials must be available (AWS_PROFILE or env vars).

const REGION = 'eu-west-1';
const TABLE_NAME = 'replace-with-actual-table-name'; // ← replace before running
const JSON_FILE_PATH = 'replace-with-path-to-financials.json'; // ← replace before running

// ─── Types ────────────────────────────────────────────────────────────────────

type FinancialsRecord = {
  issuerName: string;
  year: number;
  [key: string]: unknown;
};

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: string[] = ['issuerName', 'year'];
const NUMERIC_FIELDS: string[] = [
  'revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit',
  'totalAssets', 'intangibleAssets', 'equity', 'financialDebt', 'cash',
  'currentAssets', 'inventory', 'currentLiabilities',
];

function validateRecords(records: unknown[]): string[] {
  const errors: string[] = [];
  records.forEach((r, i) => {
    const rec = r as Record<string, unknown>;
    REQUIRED_FIELDS.forEach(f => {
      if (rec[f] == null) errors.push(`Record ${i}: missing required field '${f}'`);
    });
    if (typeof rec['issuerName'] !== 'string') errors.push(`Record ${i}: 'issuerName' must be a string`);
    if (typeof rec['year'] !== 'number' || !Number.isInteger(rec['year'])) errors.push(`Record ${i}: 'year' must be an integer`);
    NUMERIC_FIELDS.forEach(f => {
      if (rec[f] !== undefined && typeof rec[f] !== 'number') errors.push(`Record ${i}: '${f}' must be a number`);
    });
  });
  return errors;
}

// ─── Core logic ───────────────────────────────────────────────────────────────

async function run(dryRun: boolean): Promise<void> {
  console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE (will store records)'}\n`);

  let records: FinancialsRecord[];
  try {
    const raw = readFileSync(JSON_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error('JSON root must be an array');
    records = parsed as FinancialsRecord[];
  } catch (err) {
    console.error(`Failed to read or parse ${JSON_FILE_PATH}:`, err);
    process.exit(1);
  }

  const errors = validateRecords(records);
  if (errors.length > 0) {
    console.error('Validation errors:');
    errors.forEach(e => console.error(' ', e));
    process.exit(1);
  }

  console.log(`Found ${records.length} record(s) in ${JSON_FILE_PATH}`);

  const client = new DynamoDBClient({ region: REGION });
  const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });

  let stored = 0;
  let skipped = 0;

  for (const record of records) {
    console.log(`  ${dryRun ? '[DRY RUN]' : 'Storing'} ${record.issuerName} / ${record.year}`);
    if (!dryRun) {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: record,
      }));
      stored++;
    } else {
      skipped++;
    }
  }

  console.log(`\nDone. Stored: ${stored}, Skipped (dry run): ${skipped}`);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const dryRun = !process.argv.includes('--live');

run(dryRun).catch((error: unknown) => {
  console.error('Script failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
