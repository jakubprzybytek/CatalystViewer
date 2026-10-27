// Builds the int fixtures (tests/fixtures) from today's live sources and a few bonds of prod (read only).
// Rerun it to refresh the fixtures, e.g. when the source formats change or the chosen bonds mature:
//
//   npx esrun scripts/capture-fixtures/capture-fixtures.ts [--raw <folder with already downloaded pages>]
//
// Then update the expected values in tests/integration and tests/e2e. See docs/testing.md.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import axios from "axios";
import { format, isWeekend, subDays } from "date-fns";
import { utils, read, write } from "xlsx";
import { DynamoDBClient, ListTablesCommand, QueryCommand, ScanCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { parseBondsQuotesPage, readCatalystDailyStatisticsXlsFile } from "../../packages/core/src/bonds/catalyst/sources";
import { parseObligacjeBondInformationPage } from "../../packages/core/src/bonds/obligacjepl/ObligacjeBondInformationPage";

// ─── The fixture bonds ─────────────────────────────────────────────────────────

// In the sources and seeded: the updater updates them.
const UPDATED = [
  "ALE0630", "ADX1227", "ARH0227", "ACH0628", "ATL0628", "ANW1126", // corporate, WIBOR
  "PCR0527", // corporate, fixed
  "BST0730", // corporate, EUR
  "DS0432", "DS0436", "BGK1127", // treasury and BGK
  "EIB1137", "SIC1133", // EIB and municipal
  "MBH0629", "PEOH729", // mortgage covered
];
// In the sources, not seeded: the updater creates them from their obligacje.pl pages.
const NEW = ["ATL0429", "ARL0429"];
// Issuers left out of the seed: the workflow classifies them (stubbed AI on int).
const UNCLASSIFIED_ISSUERS = ["art.Locum S.A."];
// Seeded, not in the sources: the updater deactivates it.
const DEACTIVATED = ["ARH0329"];

const SOURCE_STAGE = "prod";
const OUT = "tests/fixtures";
const REGION = "eu-west-1";

// Quote pages and the sections the updater parses (CatalystWebsite.ts).
const QUOTE_PAGES: { page: string; sections: [string, string][] }[] = [
  { page: "notowania-obligacji-obligacje-korporacyjne", sections: [["Obligacje przedsiębiorstw", "PLN"], ["przedsiębiorstw", "EUR"]] },
  { page: "notowania-obligacji-obligacje-skarbowe", sections: [["Obligacje skarbowe", "PLN"], ["Obligacje skarbowe", "EUR"]] },
  { page: "notowania-obligacji-obligacje-komunalne", sections: [["Obligacje komunalne", "PLN"]] },
  { page: "notowania-obligacji-obligacje-spoldzielcze", sections: [["Obligacje Banków Spółdzielczych", "PLN"]] },
  { page: "notowania-obligacji-bankowe-papiery-wartosciowe", sections: [["Bankowe Papiery Wartościowe", "PLN"]] },
  { page: "notowania-obligacji-listy-zastawne", sections: [["Listy zastawne", "PLN"], ["Listy zastawne", "EUR"]] },
];

const IN_SOURCES = new Set([...UPDATED, ...NEW]);
const SEEDED = new Set([...UPDATED, ...DEACTIVATED]);

// ─── Download ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const rawDir = args.includes("--raw") ? args[args.indexOf("--raw") + 1] : undefined;

async function download(url: string): Promise<Buffer> {
  console.log(`Downloading ${url}`);
  // No browser User-Agent: gpwcatalyst.pl answered requests with one very slowly.
  const response = await axios.get(url, { responseType: "arraybuffer", timeout: 120_000 });
  return Buffer.from(response.data);
}

async function source(fileName: string, url: string): Promise<Buffer> {
  return rawDir && existsSync(join(rawDir, fileName)) ? readFileSync(join(rawDir, fileName)) : download(url);
}

function previousTradingDay(date: Date): Date {
  let day = subDays(date, 1);
  while (isWeekend(day)) day = subDays(day, 1);
  return day;
}

// ─── Trimming the sources to the fixture bonds ──────────────────────────────────

const ROW_REGEX = /<tr>(.+?)<\/tr>/gs;
const NAME_REGEX = /"o-instrumentach-instrument\?nazwa=(.+?)"/;

// Keeps the page as it is, but only the rows of the fixture bonds (and the header rows) in the parsed tables.
function trimQuotesPage(markup: string, sections: [string, string][]): string {
  for (const [title, currency] of sections) {
    const tableRegex = new RegExp(`${title} \\(${currency}\\).+?<table(.+?)</table>`, "s");
    const match = tableRegex.exec(markup);
    if (!match) continue;

    const tableContent = match[1];
    let currentName: string | undefined;
    const trimmed = tableContent.replace(ROW_REGEX, (row) => {
      currentName = row.match(NAME_REGEX)?.[1] ?? currentName;
      const isBondRow = row.includes('class="col4"');
      return !isBondRow || (currentName !== undefined && IN_SOURCES.has(currentName)) ? row : "";
    });

    const start = match.index + match[0].length - "</table>".length - tableContent.length;
    markup = markup.slice(0, start) + trimmed + markup.slice(start + tableContent.length);
  }

  // The pages also have a second, unparsed table with one row per bond (`<td> NAME <b>`): keep only the fixture bonds.
  return markup.replace(ROW_REGEX, (row, cells: string) => {
    const name = cells.match(/^\s*<td>\s*([A-Z0-9]{4,})\s*<b>/)?.[1];
    return name === undefined || IN_SOURCES.has(name) ? row : "";
  });
}

// Keeps the header rows, the bond type rows and the fixture bonds (column I = name).
function trimDailyStatistics(file: Buffer): Buffer {
  const workbook = read(file);
  const sheet = workbook.Sheets["instrumenty"];
  const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  const kept = rows.filter((row, index) => index < 10 || !row[7] || IN_SOURCES.has(String(row[8])));
  workbook.Sheets["instrumenty"] = utils.aoa_to_sheet(kept);
  return write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Prod data (read only) ─────────────────────────────────────────────────────

type Item = Record<string, AttributeValue>;
const dynamo = new DynamoDBClient({ region: REGION });

async function tableName(name: string): Promise<string> {
  const names: string[] = [];
  let start: string | undefined;
  do {
    const response = await dynamo.send(new ListTablesCommand({ ExclusiveStartTableName: start }));
    names.push(...(response.TableNames ?? []));
    start = response.LastEvaluatedTableName;
  } while (start);
  const matches = names.filter((n) => n.startsWith(`catalyst-viewer-${SOURCE_STAGE}-${name}Table-`));
  if (matches.length !== 1) throw new Error(`Expected one ${name} table, found ${matches.length}`);
  return matches[0];
}

async function scanAll(table: string): Promise<Item[]> {
  const items: Item[] = [];
  let startKey: Item | undefined;
  do {
    const response = await dynamo.send(new ScanCommand({ TableName: table, ExclusiveStartKey: startKey }));
    items.push(...(response.Items ?? []));
    startKey = response.LastEvaluatedKey;
  } while (startKey);
  return items;
}

async function queryAll(table: string, key: string, value: string): Promise<Item[]> {
  const response = await dynamo.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: "#k = :v",
    ExpressionAttributeNames: { "#k": key },
    ExpressionAttributeValues: { ":v": { S: value } },
  }));
  return response.Items ?? [];
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const capturedAt = new Date();
  // Noon UTC of the capture day: after the quotes were captured, same trading day.
  const referenceDate = `${format(capturedAt, "yyyy-MM-dd")}T12:00:00.000Z`;
  const reportDay = previousTradingDay(new Date(referenceDate));
  const dailyStatsFile = `catalyst_${format(reportDay, "yyyyMMdd")}.xlsx`;

  rmSync(join(OUT, "sources"), { recursive: true, force: true });
  mkdirSync(join(OUT, "sources", "gpwcatalyst"), { recursive: true });
  mkdirSync(join(OUT, "sources", "obligacje"), { recursive: true });
  mkdirSync(join(OUT, "db"), { recursive: true });

  // Sources
  const allQuotes: string[] = [];
  for (const { page, sections } of QUOTE_PAGES) {
    const original = (await source(`${page}.html`, `https://gpwcatalyst.pl/${page}`)).toString("utf-8");
    const trimmed = trimQuotesPage(original, sections);
    writeFileSync(join(OUT, "sources", "gpwcatalyst", `${page}.html`), trimmed);

    // The trimmed page must parse to exactly the original quotes of the fixture bonds.
    for (const [title, currency] of sections) {
      const expected = parseBondsQuotesPage(original, title, currency).filter((q) => IN_SOURCES.has(q.name));
      const actual = parseBondsQuotesPage(trimmed, title, currency);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${page} ${title} ${currency}: trimmed page parses differently`);
      allQuotes.push(...actual.map((q) => q.name));
    }
  }

  const statsOriginal = await source(dailyStatsFile, `https://gpwcatalyst.pl/pub/CATALYST/statystyki/statystyki_dzienne/${dailyStatsFile}`);
  const statsPath = join(OUT, "sources", "gpwcatalyst", dailyStatsFile);
  writeFileSync(statsPath, trimDailyStatistics(statsOriginal));
  writeFileSync(join(OUT, "original.xlsx.tmp"), statsOriginal);
  const expectedStats = readCatalystDailyStatisticsXlsFile(join(OUT, "original.xlsx.tmp")).filter((s) => IN_SOURCES.has(s.name));
  rmSync(join(OUT, "original.xlsx.tmp"));
  const actualStats = readCatalystDailyStatisticsXlsFile(statsPath);
  if (JSON.stringify(actualStats) !== JSON.stringify(expectedStats)) throw new Error("Trimmed daily statistics parse differently");

  for (const name of IN_SOURCES) {
    if (!actualStats.some((s) => s.name === name)) throw new Error(`${name} is not in the daily statistics`);
    if (!allQuotes.includes(name)) throw new Error(`${name} is not on the quote pages`);
  }

  for (const name of NEW) {
    const page = await source(`${name}.html`, `https://obligacje.pl/pl/obligacja/${name}`);
    writeFileSync(join(OUT, "sources", "obligacje", `${name}.html`), page);
  }

  // Seed data from prod: the seeded bonds, the quote history of all fixture bonds, and their issuers.
  const bondDetailsTable = await tableName("BondDetails");
  const bondDetails = (await scanAll(bondDetailsTable))
    .filter((item) => SEEDED.has(item.name.S!))
    .map((item) => ({ ...item, status: { S: "active" } }));
  for (const name of SEEDED) {
    if (!bondDetails.some((item) => item.name.S === name)) throw new Error(`${name} is not on ${SOURCE_STAGE}`);
  }

  const bondIds = new Set(
    bondDetails.map((b) => `${b.name.S}#${b.market.S}`)
      .concat(actualStats.filter((s) => NEW.includes(s.name)).map((s) => `${s.name}#${s.market}`)),
  );
  const months = [reportDay, subDays(reportDay, 31)].map((d) => `${d.getFullYear()}#${d.getMonth() + 1}`);
  const referenceDay = referenceDate.substring(0, 10);
  const bondStatisticsTable = await tableName("BondStatistics");
  const bondStatistics: Item[] = [];
  for (const bondId of bondIds) {
    for (const item of await queryAll(bondStatisticsTable, "name#market", bondId)) {
      if (!months.includes(item["year#month"].S!)) continue;
      // Quotes of the reference day and later come from the updater run on the fixture sources.
      const quotes = Object.fromEntries(Object.entries(item.quotes.M ?? {}).filter(([day]) => day < referenceDay));
      if (Object.keys(quotes).length > 0) bondStatistics.push({ ...item, quotes: { M: quotes } });
    }
  }

  const newIssuers = NEW.map((name) => parseObligacjeBondInformationPage(readFileSync(join(OUT, "sources", "obligacje", `${name}.html`), "utf-8")).issuer);
  for (const issuer of UNCLASSIFIED_ISSUERS) {
    if (!newIssuers.includes(issuer)) throw new Error(`${issuer} is not the issuer of a new bond`);
  }
  const issuers = new Set([...bondDetails.map((b) => b.issuer.S!), ...newIssuers]);
  UNCLASSIFIED_ISSUERS.forEach((issuer) => issuers.delete(issuer));

  const issuerProfilesTable = await tableName("IssuerProfiles");
  const issuerProfiles: Item[] = [];
  for (const issuer of issuers) {
    const records = await queryAll(issuerProfilesTable, "issuerName", issuer);
    const profile = records.find((r) => r.recordType.S === "#PROFILE");
    const latestAnalysis = records.filter((r) => r.recordType.S!.startsWith("#ANALYSIS#")).sort((a, b) => b.recordType.S!.localeCompare(a.recordType.S!))[0];
    // The summary record the profiles API reads (scorecard of the latest analysis).
    const latestSummary = records.find((r) => r.recordType.S === "#LATEST_ANALYSIS");
    if (profile) issuerProfiles.push(profile);
    if (latestAnalysis) issuerProfiles.push(latestAnalysis);
    if (latestSummary) issuerProfiles.push(latestSummary);
  }

  const sortKey = (item: Item) => JSON.stringify([item["name#market"]?.S, item["year#month"]?.S, item.issuerName?.S, item.recordType?.S]);
  const save = (table: string, items: Item[]) =>
    writeFileSync(join(OUT, "db", `${table}.json`), JSON.stringify(items.sort((a, b) => sortKey(a).localeCompare(sortKey(b))), null, 1) + "\n");
  save("BondDetails", bondDetails);
  save("BondStatistics", bondStatistics);
  save("IssuerProfiles", issuerProfiles);

  writeFileSync(join(OUT, "metadata.json"), JSON.stringify({
    referenceDate,
    capturedAt: capturedAt.toISOString(),
    dailyStatisticsFile: dailyStatsFile,
    bonds: { updated: UPDATED, new: NEW, deactivated: DEACTIVATED },
    unclassifiedIssuers: UNCLASSIFIED_ISSUERS,
  }, null, 2) + "\n");

  console.log(`Fixtures written to ${OUT}: reference date ${referenceDate}, ${bondDetails.length} bonds, ${bondStatistics.length} quote months, ${issuerProfiles.length} issuer records`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
