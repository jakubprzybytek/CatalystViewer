// Imports issuers' annual financial statements into a stage. Run inside `sst shell`:
//
//   npx sst shell --stage prod -- npm run import-filing -- <file>... [--issuer "<name>"] [--krs <number>] [--dry-run] [--force]
//
// Files (format detected):
//   .xml    Polish accounting act statement from the KRS financial documents browser (rdf-przegladarka.ms.gov.pl)
//   .zip    ESEF report package of a listed company (IFRS, tagged); .xhtml with inline XBRL works too
//   .xhtml  untagged IFRS statement (e.g. separate statements), read by line labels
//
// --issuer   the app's issuer name, when the filing's company name doesn't match one (one file only)
// --krs      the company's KRS number, when the filing doesn't give one (one file only)
// --dry-run  parse, match and check, but write nothing
// --force    store a filing whose consistency checks failed, or a second company for an issuer
//
// Without `sst shell` and with --dry-run, it only parses and prints the figures.
// See docs/development.md and packages/core/src/bonds/fundamentals/filings/importFiling.ts.

import { readFileSync } from "fs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Resource } from "sst";
import { IssuerProfilesTable } from "../../packages/core/src/storage/issuerProfiles";
import { IssuerFinancialsTable } from "../../packages/core/src/storage/issuerFinancials";
import type { FilingField, ParsedFiling } from "../../packages/core/src/bonds/fundamentals/filings/FilingParser";
import { importFiling, ImportFilingError, readFiling } from "../../packages/core/src/bonds/fundamentals/filings/importFiling";

const REGION = "eu-west-1";

function parseArgs(argv: string[]) {
  const files: string[] = [];
  let issuerName: string | undefined;
  let krs: string | undefined;
  let dryRun = false;
  let force = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--issuer") issuerName = argv[++i];
    else if (arg === "--krs") krs = argv[++i];
    else if (arg === "--dry-run") dryRun = true;
    else if (arg === "--force") force = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option ${arg}`);
    else files.push(arg);
  }
  if (files.length === 0) throw new Error('Usage: npm run import-filing -- <file>... [--issuer "<name>"] [--krs <number>] [--dry-run] [--force]');
  if ((issuerName || krs) && files.length > 1) throw new Error("--issuer and --krs work with one file at a time");
  return { files, issuerName, krs, dryRun, force };
}

const ROWS: [FilingField, string][] = [
  ["revenue", "Revenue"], ["ebit", "EBIT"], ["depreciation", "Depreciation"], ["interestExpense", "Interest"],
  ["netProfit", "Net profit"], ["totalAssets", "Total assets"], ["equity", "Equity"], ["financialDebt", "Financial debt"],
  ["bonds", "  of which bonds"], ["cash", "Cash"], ["currentAssets", "Current assets"], ["inventory", "Inventory"],
  ["currentLiabilities", "Current liabilities"], ["operatingCashFlow", "Operating cash flow"], ["capex", "Capex"],
];

function printFiling(filing: ParsedFiling): void {
  const id = [filing.krs && `KRS ${filing.krs}`, filing.lei && `LEI ${filing.lei}`].filter(Boolean).join(" · ") || "no KRS/LEI";
  console.log(`  ${filing.companyName} · ${id} · ${filing.scope === "group" ? "group (consolidated)" : "single company"} · ${filing.schema}`);
  const head = [`${filing.currency} m`, ...filing.periods.map((p) => `${p.periodEnd}${p.months !== 12 ? ` (${p.months}m)` : ""}`)];
  const lines = ROWS
    .filter(([field]) => filing.periods.some((p) => p.figures[field]))
    .map(([field, label]) => [label, ...filing.periods.map((p) => {
      const v = p.figures[field]?.value;
      return v === undefined ? "—" : (v / 1e6).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    })]);
  const widths = head.map((_, i) => Math.max(...[head, ...lines].map((l) => l[i].length)));
  for (const line of [head, ...lines]) {
    console.log("  " + line.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("   "));
  }
}

function linkedResources() {
  try {
    return { issuerProfiles: Resource.IssuerProfiles.name, issuerFinancials: Resource.IssuerFinancials.name, filings: Resource.Filings.name, stage: Resource.App.stage };
  } catch {
    return undefined;
  }
}

async function main() {
  const { files, issuerName, krs, dryRun, force } = parseArgs(process.argv.slice(2));
  const resources = linkedResources();

  if (!resources) {
    if (!dryRun) throw new Error("Run inside `sst shell --stage <stage>` to import (or add --dry-run to only parse)");
    for (const file of files) {
      console.log(`\n${file} (parse only, no stage)`);
      try {
        const { filing } = readFiling(readFileSync(file), file);
        printFiling(filing);
        for (const note of filing.notes ?? []) console.log(`  · ${note}`);
        for (const check of filing.checks) console.log(`  ⚠ ${check}`);
      } catch (error) {
        console.log(`  ✗ ${error instanceof Error ? error.message : error}`);
      }
    }
    return;
  }

  const dynamo = new DynamoDBClient({ region: REGION });
  const profiles = await new IssuerProfilesTable(dynamo, resources.issuerProfiles).getProfiles();
  const deps = {
    issuerNames: profiles.map((p) => p.issuerName),
    financialsTable: new IssuerFinancialsTable(dynamo, resources.issuerFinancials),
    s3: new S3Client({ region: REGION }),
    bucket: resources.filings,
  };

  let failed = 0;
  for (const file of files) {
    console.log(`\n${file} → ${resources.stage}${dryRun ? " (dry run)" : ""}`);
    try {
      const result = await importFiling(deps, readFileSync(file), { issuerName, krs, fileName: file, dryRun, force });
      printFiling(result.filing);
      for (const note of result.filing.notes ?? []) console.log(`  · ${note}`);
      console.log(`  Issuer: ${result.issuerName} (stored under ${result.entityId})`);
      for (const warning of result.warnings) console.log(`  ⚠ ${warning}`);
      for (const s of result.stored) {
        const what = dryRun ? "would store" : s.written ? "stored" : "kept the existing row (from that year's own filing)";
        console.log(`  ${s.periodEnd} (${s.column === "current" ? "this filing's year" : "comparative year"}): ${what}`);
      }
      if (!dryRun) console.log(`  File: s3://${resources.filings}/${result.s3Key}`);
    } catch (error) {
      failed++;
      console.log(`  ✗ ${error instanceof ImportFilingError || error instanceof Error ? error.message : error}`);
    }
  }
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
