// Adds statement lines to the years imported before lines were stored. Run inside `sst shell`:
//
//   npx sst shell --stage dev -- npm run reparse-filings [-- --pdf] [-- --only "<issuer>"] [-- --dry-run] [-- --redo]
//
// For each stored original in the Filings bucket it parses the file with the current code and adds
// `lines`, `standard`, `presentedUnit`, `lineSigns` and `review` to the years read from it. It never
// changes figures: a year whose re-parsed figures differ from the stored ones is reported and left alone.
//
// --pdf      also PDFs: one model read each (~$0.15 with Sonnet); without it they are skipped
// --only     issuers whose name contains this text
// --dry-run  parse and compare, write nothing
// --redo     also years that already have lines
// --model    model alias for PDFs (default: the app's default model)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { Resource } from "sst";
import { DEFAULT_MODEL_ALIAS, MODEL_ALIASES, resolveModelId, type ModelAlias } from "../../packages/core/src/ai/models";
import { bedrockTranscriber } from "../../packages/core/src/bonds/fundamentals/filings/AiPdfExtractor";
import { IssuerFinancialsTable, type DbIssuerFinancialsRecord } from "../../packages/core/src/storage/issuerFinancials";
import type { FilingField, FilingPeriod } from "../../packages/core/src/bonds/fundamentals/filings/FilingParser";
import { readAnyFiling } from "../../packages/core/src/bonds/fundamentals/filings/importFiling";

const REGION = "eu-west-1";

// Fields whose stored and re-parsed values differ by more than rounding (0.5 of a unit).
function figureDifferences(stored: DbIssuerFinancialsRecord["figures"], parsed: FilingPeriod["figures"]): string[] {
  const fields = new Set([...Object.keys(stored), ...Object.keys(parsed)] as FilingField[]);
  return [...fields].flatMap((f) => {
    const [a, b] = [stored[f]?.value, parsed[f]?.value];
    if (a !== undefined && b !== undefined && Math.abs(a - b) <= 0.5) return [];
    return [`${f} stored ${a?.toLocaleString("en-US") ?? "none"}, re-parsed ${b?.toLocaleString("en-US") ?? "none"}`];
  });
}

async function main() {
  const argv = process.argv.slice(2);
  const withPdf = argv.includes("--pdf");
  const dryRun = argv.includes("--dry-run");
  const redo = argv.includes("--redo");
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1]?.toLowerCase() : undefined;
  const model = (argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : DEFAULT_MODEL_ALIAS) as ModelAlias;
  if (!MODEL_ALIASES.includes(model)) throw new Error(`--model: one of ${MODEL_ALIASES.join(", ")}`);

  let bucket: string, table: string;
  try {
    bucket = Resource.Filings.name;
    table = Resource.IssuerFinancials.name;
  } catch {
    throw new Error("Run inside `sst shell --stage <stage>`");
  }
  const s3 = new S3Client({ region: REGION });
  const financials = new IssuerFinancialsTable(new DynamoDBClient({ region: REGION }), table);
  const transcribe = bedrockTranscriber(new BedrockRuntimeClient({ region: REGION }), resolveModelId(model), model);

  const rows = (await financials.getAll())
    .filter((r) => !only || r.issuerName.toLowerCase().includes(only))
    .filter((r) => redo || !r.standard);
  const byFile = new Map<string, DbIssuerFinancialsRecord[]>();
  for (const r of rows) byFile.set(r.filing.key, [...(byFile.get(r.filing.key) ?? []), r]);
  console.log(`${rows.length} year(s) from ${byFile.size} file(s) to do${dryRun ? " (dry run)" : ""}`);

  let added = 0, skipped = 0, failed = 0;
  for (const [key, fileRows] of byFile) {
    const name = `${fileRows[0].issuerName}: ${key}`;
    if (fileRows[0].filing.format === "ai-pdf" && !withPdf) {
      console.log(`- ${name}: PDF, skipped (--pdf to read it with the model)`);
      skipped += fileRows.length;
      continue;
    }
    try {
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const data = Buffer.from(await object.Body!.transformToByteArray());
      const { filing } = await readAnyFiling(data, key, transcribe);
      if (filing.checks.length) console.log(`  ${name}: checks now report: ${filing.checks.join("; ")}`);
      for (const row of fileRows) {
        const period = filing.periods.find((p) => p.periodEnd === row.periodEnd);
        const label = `${row.issuerName} ${row.period}`;
        if (!period) { console.log(`✗ ${label}: no such year in the file`); failed++; continue; }
        if (filing.scope !== row.scope) { console.log(`✗ ${label}: the file is now read as ${filing.scope}`); failed++; continue; }
        const diffs = figureDifferences(row.figures, period.figures);
        if (diffs.length) { console.log(`✗ ${label}: figures differ, left alone:\n    ${diffs.join("\n    ")}`); failed++; continue; }
        const written = dryRun || await financials.addLines(row.entityId, row.period, key, {
          standard: filing.standard, presentedUnit: filing.presentedUnit, lineSigns: filing.lineSigns, lines: period.lines, review: { status: "parsed" },
          ...(filing.extraction ? { linesExtraction: filing.extraction } : {}),
        });
        if (!written) { console.log(`✗ ${label}: the row changed meanwhile, left alone`); failed++; continue; }
        const kb = (JSON.stringify(period.lines).length / 1024).toFixed(0);
        console.log(`✓ ${label}: ${period.lines.length} lines (${kb} KB)${dryRun ? ", not written" : ""}`);
        added++;
      }
    } catch (error) {
      console.log(`✗ ${name}: ${error instanceof Error ? error.message : error}`);
      failed += fileRows.length;
    }
  }
  console.log(`\n${added} year(s) ${dryRun ? "ready" : "given lines"}, ${skipped} skipped, ${failed} left alone`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
