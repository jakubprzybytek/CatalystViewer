// Checks imported reports against figures read by hand from their printed statements (expected.json).
// Run inside `sst shell` (reads the stage's Filings bucket and IssuerFinancials table):
//
//   npx sst shell --stage prod -- npm run check-filings [-- --pdf] [-- --only "<issuer>"]
//
// For each report it compares, with the hand-checked figures:
//   - the stored row (what the app shows),
//   - a fresh parse of the original file with the current code (KRS XML, ESEF, IFRS text; free),
//   - with --pdf, a fresh read of PDFs by the model too (one paid call each, ~$0.15 with Sonnet).
// Exits with 1 when any figure differs. Run it after changing the parsers or the PDF prompt.

import { readFileSync } from "fs";
import path from "path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { Resource } from "sst";
import { DEFAULT_MODEL_ALIAS, resolveModelId } from "../../packages/core/src/ai/models";
import { bedrockTranscriber } from "../../packages/core/src/bonds/fundamentals/filings/AiPdfExtractor";
import { IssuerFinancialsTable } from "../../packages/core/src/storage/issuerFinancials";
import type { FilingField, SourcedFigure } from "../../packages/core/src/bonds/fundamentals/filings/FilingParser";
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

async function main() {
  const argv = process.argv.slice(2);
  const withPdf = argv.includes("--pdf");
  const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1]?.toLowerCase() : undefined;
  const { reports } = JSON.parse(readFileSync(path.join(__dirname, "expected.json"), "utf8")) as { reports: Expected[] };

  let bucket: string, table: string;
  try {
    bucket = Resource.Filings.name;
    table = Resource.IssuerFinancials.name;
  } catch {
    throw new Error("Run inside `sst shell --stage <stage>`");
  }
  const s3 = new S3Client({ region: REGION });
  const stored = new Map((await new IssuerFinancialsTable(new DynamoDBClient({ region: REGION }), table).getAll()).map((r) => [`${r.entityId}|${r.period}`, r]));
  const transcribe = bedrockTranscriber(new BedrockRuntimeClient({ region: REGION }), resolveModelId(DEFAULT_MODEL_ALIAS), DEFAULT_MODEL_ALIAS);

  let failed = 0;
  for (const report of reports.filter((r) => !only || r.issuer.toLowerCase().includes(only))) {
    const name = `${report.issuer} ${report.period.split("#")[0]} (${report.format})`;
    const problems: string[] = [];

    const row = stored.get(`${report.entityId}|${report.period}`);
    if (!row) problems.push("stored: no row");
    else problems.push(...differences(report.thousands, row.figures).map((d) => `stored: ${d}`));

    const isPdf = report.format === "ai-pdf";
    let reparsed = "not re-read (PDF; --pdf to re-read with the model)";
    if (!isPdf || withPdf) {
      try {
        const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: report.file }));
        const data = Buffer.from(await object.Body!.transformToByteArray());
        const { filing } = await readAnyFiling(data, report.file, transcribe);
        const period = filing.periods.find((p) => p.periodEnd === report.period.split("#")[0]);
        problems.push(...differences(report.thousands, period?.figures).map((d) => `re-read: ${d}`));
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
      console.log(`✓ ${name}: stored${reparsed === "re-read" ? " and re-read" : `, ${reparsed}`}`);
    }
  }
  console.log(failed ? `\n${failed} report(s) differ from the hand-checked figures` : "\nAll reports match the hand-checked figures");
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
