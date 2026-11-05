// Checks imported reports against figures read by hand from their printed statements (expected.json).
// Run inside `sst shell` (reads the stage's Filings bucket and IssuerFinancials table):
//
//   npx sst shell --stage prod -- npm run check-filings [-- --pdf] [-- --only "<issuer>"] [-- --mark]
//
// For each report it compares, with the hand-checked figures:
//   - the stored row (what the app shows),
//   - a fresh parse of the original file with the current code (KRS XML, ESEF, IFRS text; free),
//   - with --pdf, a fresh read of PDFs by the model too (one paid call each, ~$0.15 with Sonnet).
// It also checks the statement lines of both (all three statements there, the total assets line equal to
// the figure). With --mark, a report that passes gets review status "hand-checked" on its stored row.
// Exits with 1 when any figure differs. Run it after changing the parsers or the PDF prompt.

import { existsSync, readFileSync } from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { Resource } from "sst";
import { DEFAULT_MODEL_ALIAS, resolveModelId } from "../../packages/core/src/ai/models";
import { bedrockTranscriber } from "../../packages/core/src/bonds/fundamentals/filings/AiPdfExtractor";
import { IssuerFinancialsTable, reportPeriodEndOf } from "../../packages/core/src/storage/issuerFinancials";
import type { FilingField, SourcedFigure } from "../../packages/core/src/bonds/fundamentals/filings/FilingParser";
import type { StatementLine } from "../../packages/core/src/bonds/fundamentals/filings/statementLines";
import { readAnyFiling } from "../../packages/core/src/bonds/fundamentals/filings/importFiling";

const REGION = "eu-west-1";

type Expected = {
  issuer: string;
  entityId: string;
  period: string;          // "<period end>#group|single"
  file: string;            // S3 key of the original
  format: string;
  currency: string;
  thousands: Partial<Record<FilingField, number>>;
};

type Figures = Partial<Record<FilingField, SourcedFigure>>;

// Differences in thousands, rounded: "revenue 1,234 ≠ 1,240".
function differences(expected: Expected["thousands"], figures: Figures | undefined): string[] {
  if (!figures) return ["no figures"];
  return Object.entries(expected).flatMap(([field, want]) => {
    const got = figures[field as FilingField]?.value;
    const gotThousands = got === undefined ? undefined : Math.round(got / 1000);
    return gotThousands === want ? [] : [`${field} ${gotThousands?.toLocaleString("en-US") ?? "missing"} ≠ ${want!.toLocaleString("en-US")}`];
  });
}

// Problems with a year's statement lines: a statement missing, or the total assets line not the figure.
function lineProblems(lines: StatementLine[] | undefined, figures: Figures | undefined): string[] {
  if (!lines?.length) return ["no statement lines"];
  const problems = (["balance", "income", "cashFlow"] as const).filter((s) => !lines.some((l) => l.statement === s)).map((s) => `no ${s} lines`);
  const assets = lines.find((l) => l.statement === "balance" && l.item === "totalAssets");
  if (!assets) problems.push("no total assets line");
  else if (figures?.totalAssets && Math.round(assets.value) !== Math.round(figures.totalAssets.value)) {
    problems.push(`total assets line ${assets.value.toLocaleString("en-US")} ≠ figure ${figures.totalAssets.value.toLocaleString("en-US")}`);
  }
  return problems;
}

async function main() {
  const argv = process.argv.slice(2);
  const withPdf = argv.includes("--pdf");
  const mark = argv.includes("--mark");
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1]?.toLowerCase() : undefined;
  // esrun runs a temporary copy of this file: __dirname is this folder on Linux but the project root on Windows
  const expectedPath = [path.join(__dirname, "expected.json"), path.join(__dirname, "scripts", "check-filings", "expected.json"),
    path.join(process.cwd(), "scripts", "check-filings", "expected.json")].find(p => existsSync(p));
  if (!expectedPath) throw new Error("expected.json not found: run from the repository root");
  const { reports } = JSON.parse(readFileSync(expectedPath, "utf8")) as { reports: Expected[] };

  let bucket: string, table: string;
  try {
    bucket = Resource.Filings.name;
    table = Resource.IssuerFinancials.name;
  } catch {
    throw new Error("Run inside `sst shell --stage <stage>`");
  }
  const s3 = new S3Client({ region: REGION });
  const financials = new IssuerFinancialsTable(new DynamoDBClient({ region: REGION }), table);
  const transcribe = bedrockTranscriber(new BedrockRuntimeClient({ region: REGION }), resolveModelId(DEFAULT_MODEL_ALIAS), DEFAULT_MODEL_ALIAS);

  let failed = 0;
  for (const report of reports.filter((r) => !only || r.issuer.toLowerCase().includes(only))) {
    const name = `${report.issuer} ${report.period.split("#")[0]} (${report.format})`;
    const problems: string[] = [];

    const row = await financials.get(report.entityId, report.period);
    // The year's row may now come from a more recent report (its comparative column, restated): the hand-read
    // figures are this report's own, so only the re-read is compared then.
    const replaced = row && row.filing.key !== report.file && reportPeriodEndOf(row) > report.period.split("#")[0];
    if (!row) problems.push("stored: no row");
    else if (replaced) { /* compared on the re-read below */ }
    else {
      problems.push(...differences(report.thousands, row.figures).map((d) => `stored: ${d}`));
      problems.push(...lineProblems(row.lines, row.figures).map((d) => `stored: ${d}`));
    }

    const isPdf = report.format === "ai-pdf";
    let reparsed = "not re-read (PDF; --pdf to re-read with the model)";
    if (!isPdf || withPdf) {
      try {
        const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: report.file }));
        const data = Buffer.from(await object.Body!.transformToByteArray());
        const { filing } = await readAnyFiling(data, report.file, transcribe);
        const period = filing.periods.find((p) => p.periodEnd === report.period.split("#")[0]);
        problems.push(...differences(report.thousands, period?.figures).map((d) => `re-read: ${d}`));
        problems.push(...lineProblems(period?.lines, period?.figures).map((d) => `re-read: ${d}`));
        reparsed = "re-read";
      } catch (error) {
        problems.push(`re-read: ${error instanceof Error ? error.message : error}`);
      }
    }

    if (problems.length) {
      failed++;
      console.log(`✗ ${name}`);
      for (const p of problems) console.log(`    ${p}`);
    } else {
      const stored = replaced ? "stored row from a more recent report (not compared)" : "stored";
      console.log(`✓ ${name}: ${stored}${reparsed === "re-read" ? " and re-read" : `, ${reparsed}`}`);
      if (mark && row && !replaced && row.review?.status !== "hand-checked") {
        await financials.setReview(report.entityId, report.period, { status: "hand-checked", note: "scripts/check-filings/expected.json", at: new Date().toISOString() });
        console.log("    marked hand-checked");
      }
    }
  }
  console.log(failed ? `\n${failed} report(s) differ from the hand-checked figures` : "\nAll reports match the hand-checked figures");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
