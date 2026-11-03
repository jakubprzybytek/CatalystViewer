// Stores each year's item totals (the sum of its statement lines per line item, with write-downs
// marked) as `items`, for the scorecard's reads without lines. Run inside `sst shell`; a dry run unless --write:
//
//   npx sst shell --stage dev -- npm run item-totals [-- --write] [-- --only "<issuer>"]
//
// Only the `items` attribute is written; lines and figures stay as they are. The dry run prints the
// totals the sector rules use, and compares item totals with the figures made of the same lines.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { IssuerFinancialsTable } from "../../packages/core/src/storage/issuerFinancials";
import { itemTotals, markWriteDowns, type LineItem } from "../../packages/core/src/bonds/fundamentals/filings/statementLines";

const SHOWN: LineItem[] = ["debtLeases", "contractLiabilities", "interestPaid", "investmentProperty", "impairment"];
// Figures that are one line item, to check the totals against
const SAME: [string, LineItem][] = [["inventory", "inventory"], ["cash", "cash"], ["operatingCashFlow", "operatingCashFlow"], ["equity", "equity"], ["totalAssets", "totalAssets"]];

const m = (v: number | undefined) => (v === undefined ? "-" : (v / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 }));

async function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const onlyAt = argv.indexOf("--only");
  const only = onlyAt >= 0 ? argv[onlyAt + 1]?.toLowerCase() : undefined;
  let tableName: string;
  try { tableName = Resource.IssuerFinancials.name; } catch { throw new Error("Run inside `sst shell --stage <stage>`"); }
  const table = new IssuerFinancialsTable(new DynamoDBClient({ region: "eu-west-1" }), tableName);

  const rows = (await table.getAll()).filter(r => !only || r.issuerName.toLowerCase().includes(only))
    .sort((a, b) => a.issuerName.localeCompare(b.issuerName) || a.period.localeCompare(b.period));
  let mismatches = 0;
  for (const summary of rows) {
    const row = await table.get(summary.entityId, summary.period);
    if (!row?.lines?.length) { console.log(`- ${summary.issuerName} ${summary.period}: no lines`); continue; }
    const lines = row.lines.map(l => ({ ...l }));
    markWriteDowns(lines);
    const items = itemTotals(lines, row.lineSigns);
    const off = SAME.flatMap(([field, item]) => {
      const figure = row.figures[field as keyof typeof row.figures]?.value;
      return figure !== undefined && items[item] !== undefined && Math.abs(figure - items[item]!) > Math.max(1, Math.abs(figure) * 0.001)
        ? [`${field} ${m(figure)} vs lines ${m(items[item])}`] : [];
    });
    mismatches += off.length;
    console.log(`${row.issuerName} ${row.period} [${row.filing.format}] ${SHOWN.map(i => `${i}=${m(items[i])}`).join(" ")}${off.length ? `  ⚠ ${off.join("; ")}` : ""}`);
    if (write) await table.setItems(row.entityId, row.period, items);
  }
  console.log(`\n${rows.length} years, ${mismatches} figure mismatch(es)${write ? ", items stored" : "; dry run"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
