/**
 * store-issuer-financials.ts
 *
 * Reads a JSON file of financial records and stores them into the
 * IssuerFinancials DynamoDB table.
 *
 * Usage:
 *   npm run store -- <table-name> <json-file>         # live run
 *   npm run store:dry -- <table-name> <json-file>     # dry run (no writes)
 *
 * The JSON file must be an array of objects matching DbIssuerFinancials:
 * [
 *   {
 *     "issuerName": "Acme S.A.",
 *     "year": 2024,
 *     "revenue": 48200,
 *     "ebit": 5100,
 *     "depreciation": 2700,
 *     "interestExpense": 1200,
 *     "netProfit": 2900,
 *     "totalAssets": 42000,
 *     "intangibleAssets": 800,
 *     "equity": 18500,
 *     "financialDebt": 14000,
 *     "cash": 3200,
 *     "currentAssets": 16000,
 *     "inventory": 4500,
 *     "currentLiabilities": 9800
 *   }
 * ]
 *
 * AWS credentials must be available in the environment (AWS_PROFILE or env vars).
 */

import { readFileSync } from 'node:fs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const REQUIRED_FIELDS: string[] = ['issuerName', 'year'];
const NUMERIC_FIELDS: string[] = [
  'revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit',
  'totalAssets', 'intangibleAssets', 'equity', 'financialDebt', 'cash',
  'currentAssets', 'inventory', 'currentLiabilities',
];

// ─── CLI args ──────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');
const args = process.argv.slice(2).filter(a => a !== '--dry-run');

const [tableName, jsonFilePath] = args;

if (!tableName || !jsonFilePath) {
  console.error('Usage: npx tsx store-issuer-financials.ts <table-name> <json-file> [--dry-run]');
  process.exit(1);
}

// ─── Load and validate input ──────────────────────────────────────────────────

type FinancialsRecord = {
  issuerName: string;
  year: number;
  [key: string]: unknown;
};

let records: FinancialsRecord[];
try {
  const raw = readFileSync(jsonFilePath, 'utf-8');
  records = JSON.parse(raw) as FinancialsRecord[];
  if (!Array.isArray(records)) throw new Error('JSON root must be an array');
} catch (err) {
  console.error(`Failed to read or parse ${jsonFilePath}:`, err);
  process.exit(1);
}

const errors: string[] = [];
records.forEach((r, i) => {
  REQUIRED_FIELDS.forEach(f => {
    if (r[f] == null) errors.push(`Record ${i}: missing required field '${f}'`);
  });
  if (typeof r.issuerName !== 'string') errors.push(`Record ${i}: 'issuerName' must be a string`);
  if (typeof r.year !== 'number' || !Number.isInteger(r.year)) errors.push(`Record ${i}: 'year' must be an integer`);
  NUMERIC_FIELDS.forEach(f => {
    if (r[f] !== undefined && typeof r[f] !== 'number') errors.push(`Record ${i}: '${f}' must be a number`);
  });
});

if (errors.length > 0) {
  console.error('Validation errors:');
  errors.forEach(e => console.error(' ', e));
  process.exit(1);
}

console.log(`Found ${records.length} record(s) in ${jsonFilePath}`);
if (isDryRun) console.log('[DRY RUN] No writes will be made.');

// ─── Write to DynamoDB ────────────────────────────────────────────────────────

const client = new DynamoDBClient({ region: 'eu-west-1' });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

let stored = 0;
let skipped = 0;

for (const record of records) {
  console.log(`  ${isDryRun ? '[DRY]' : 'Storing'} ${record.issuerName} / ${record.year}`);
  if (!isDryRun) {
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: record,
    }));
    stored++;
  } else {
    skipped++;
  }
}

console.log(`\nDone. Stored: ${stored}, Skipped (dry run): ${skipped}`);
