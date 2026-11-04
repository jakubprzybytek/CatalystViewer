// Sorts annual reports downloaded by hand (from the KRS financial documents browser, rdf-przegladarka.ms.gov.pl,
// or a company's site) and checks them before an import. Reads every file in a folder, also inside zips,
// works out the company, fiscal year and scope from the file itself (names don't matter), parses it as the
// importer would (free: no model call, nothing written to any stage), and compares the result with the
// checklist (checklist.json, the same rows as the "KRS report checklist" page).
//
//   npm run sort-filings -- <folder>                  report only
//   npm run sort-filings -- <folder> --copy [--to <folder>]   also copy each statement to <to>/<company>/FY<year>-<scope>.<ext>
//   npm run sort-filings -- <folder> --move [--to <folder>]   the same, removing the originals
//
// <to> defaults to <folder>/sorted. Works on Windows too (paths with backslashes, e.g. C:\Downloads\krs).
// PDFs are listed but not parsed: reading them is a paid model call, done by import-filing.
// ESEF packages identify the company by LEI only; its KRS number is looked up in the LEI register (GLEIF).

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { basename, extname, join, resolve } from "path";
import { createHash } from "crypto";
import { readFiling } from "../../packages/core/src/bonds/fundamentals/filings/importFiling";
import { isZip, readZip } from "../../packages/core/src/bonds/fundamentals/filings/zip";
import { looksLikeEsef } from "../../packages/core/src/bonds/fundamentals/filings/EsefParser";
import type { ParsedFiling } from "../../packages/core/src/bonds/fundamentals/filings/FilingParser";

type Expected = { company: string; krs: string; year: number; scope: "single" | "group"; optional?: boolean };

// A statement found: a file, or an entry of a zip that isn't itself an ESEF package
type Candidate = { source: string; name: string; data: Buffer; fromZip?: string };

type Found = Candidate & {
  kind: "statement" | "pdf" | "skipped" | "unreadable";
  reason?: string;
  filing?: ParsedFiling;
  krs?: string;
  year?: number;
  months?: number;
  sha?: string;
};

const SKIP = /\.(sig|p7s|txt|html?|docx?|xlsx?|jpe?g|png)$/i;
// A signature file (.xades) can carry the statement itself (the KRS browser's signed XML): it is read, and
// skipped only when it holds no statement.
const STATEMENT = /\.(xml|zip|xbri|xhtml|pdf|xades)$/i;

function parseArgs(argv: string[]) {
  let folder: string | undefined;
  let to: string | undefined;
  let mode: "report" | "copy" | "move" = "report";
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--copy") mode = "copy";
    else if (a === "--move") mode = "move";
    else if (a === "--to") to = argv[++i];
    else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else folder = a;
  }
  if (!folder) throw new Error("Usage: npm run sort-filings -- <folder> [--copy | --move] [--to <folder>]");
  const root = resolve(folder);
  return { folder: root, to: resolve(to ?? join(root, "sorted")), mode };
}

// Files in the folder (not in the output folder), and the statement entries of zips that aren't ESEF packages:
// the KRS browser can hand out a zip with the statement and its signature.
function candidates(folder: string, out: string): Candidate[] {
  const list: Candidate[] = [];
  for (const name of readdirSync(folder).sort()) {
    const path = join(folder, name);
    if (resolve(path) === out || statSync(path).isDirectory()) continue;
    const data = readFileSync(path);
    if (isZip(data) && !looksLikeEsef(data)) {
      for (const e of readZip(data)) {
        if (e.name.endsWith("/")) continue;
        list.push({ source: path, name: basename(e.name), data: e.data(), fromZip: name });
      }
    } else list.push({ source: path, name, data });
  }
  return list;
}

const gleifCache = new Map<string, string | undefined>();
async function krsOfLei(lei: string): Promise<string | undefined> {
  if (gleifCache.has(lei)) return gleifCache.get(lei);
  let krs: string | undefined;
  try {
    await new Promise(r => setTimeout(r, 1000));   // GLEIF: about one request a second
    const res = await fetch(`https://api.gleif.org/api/v1/lei-records/${lei}`, { signal: AbortSignal.timeout(15_000) });
    if (res.ok) {
      const e = ((await res.json()) as any).data?.attributes?.entity;
      if (e?.registeredAt?.id === "RA000484" && e.registeredAs) krs = String(e.registeredAs).padStart(10, "0");
    }
  } catch { /* offline: matched by name only */ }
  gleifCache.set(lei, krs);
  return krs;
}

async function examine(c: Candidate): Promise<Found> {
  if (SKIP.test(c.name) || !STATEMENT.test(c.name) && !isZip(c.data)) return { ...c, kind: "skipped", reason: "not a statement file" };
  if (/\.pdf$/i.test(c.name) || c.data.subarray(0, 5).toString() === "%PDF-") return { ...c, kind: "pdf", sha: sha(c.data) };
  try {
    const { filing } = readFiling(c.data, c.name);
    const current = filing.periods[0];
    const krs = filing.krs?.padStart(10, "0") ?? (filing.lei ? await krsOfLei(filing.lei) : undefined);
    return { ...c, kind: "statement", filing, krs, year: Number(current.periodEnd.slice(0, 4)), months: current.months, sha: sha(c.data) };
  } catch (e) {
    if (/\.xades$/i.test(c.name)) return { ...c, kind: "skipped", reason: "a signature only" };
    return { ...c, kind: "unreadable", reason: (e as Error).message.split("\n")[0].slice(0, 160) };
  }
}

const label = (f: Candidate) => (f.fromZip ? f.fromZip + " › " + f.name : f.name);
const sha = (d: Buffer) => createHash("sha256").update(d).digest("hex");
const millions = (v?: number) => (v === undefined ? "—" : (v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }));
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L")
  .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

async function main() {
  const { folder, to, mode } = parseArgs(process.argv.slice(2));
  if (!existsSync(folder)) throw new Error(`No such folder: ${folder}`);
  // esrun runs a temporary copy of this file: __dirname is this folder on Linux but the project root on Windows
  const checklistPath = [join(__dirname, "checklist.json"), join(__dirname, "scripts", "sort-filings", "checklist.json"),
    join(process.cwd(), "scripts", "sort-filings", "checklist.json")].find(p => existsSync(p));
  if (!checklistPath) throw new Error("checklist.json not found: run from the repository root");
  const checklist: Expected[] = JSON.parse(readFileSync(checklistPath, "utf-8"));

  const found: Found[] = [];
  for (const c of candidates(folder, to)) found.push(await examine(c));
  const statements = found.filter(f => f.kind === "statement");

  console.log(`\n${folder}: ${found.length} file(s), ${statements.length} statement(s)\n`);
  const seen = new Map<string, Found>();
  for (const f of found) {
    const where = label(f);
    if (f.kind === "skipped") { console.log(`  · ${where}: skipped (${f.reason})`); continue; }
    if (f.kind === "unreadable") { console.log(`  ✗ ${where}: can't be read: ${f.reason}`); continue; }
    if (f.kind === "pdf") { console.log(`  ? ${where}: PDF, not checked here (read by the model on import, ~$0.15)`); continue; }
    const p = f.filing!;
    const cur = p.periods[0];
    const key = `${f.krs ?? p.lei}#${cur.periodEnd}#${p.scope}`;
    const dup = seen.get(key);
    const exp = checklist.find(e => e.krs === f.krs && e.year === f.year);
    const other = exp ? undefined : checklist.find(e => e.krs === f.krs);
    const notes = !exp && !other && f.krs ? ["not on the checklist: fine to import if it's newer than what the app has"] : [];
    const flags = [
      p.checks.length ? `checks failed: ${p.checks.join("; ")}` : "",
      f.months !== 12 ? `${f.months}-month period, not a full year` : "",
      dup ? "same company, year and scope as " + label(dup) + (dup.sha === f.sha ? " (identical file)" : "") : "",
      exp && exp.scope !== p.scope ? "the checklist asks for the " + (exp.scope === "group" ? "group (Skonsolidowane)" : "single-company") + " report" : "",
      !exp && other ? "wrong year: the checklist asks for FY" + other.year + " (this is FY" + f.year + ")" : "",
      !f.krs ? "no KRS number found" + (p.lei ? " (LEI " + p.lei + " not in the KRS, or GLEIF unreachable)" : "") : "",
    ].filter(Boolean);
    if (!dup) seen.set(key, f);
    console.log(`  ${flags.length ? "!" : "✓"} ${where}`);
    console.log("      " + [p.companyName, "KRS " + (f.krs ?? "?"), ...(p.lei ? ["LEI " + p.lei] : []), p.scope === "group" ? "group" : "single company", "FY ending " + cur.periodEnd, p.format + ", " + p.currency].join(" · "));
    console.log(`      revenue ${millions(cur.figures.revenue?.value)} m · net profit ${millions(cur.figures.netProfit?.value)} m · total assets ${millions(cur.figures.totalAssets?.value)} m · ${p.periods.length} year(s) in the file`);
    for (const fl of flags) console.log("      ! " + fl);
    for (const n of notes) console.log("      · " + n);
  }

  // What the checklist still needs
  const have = new Set(statements.map(f => `${f.krs}#${f.year}#${f.filing!.scope}`));
  const missing = checklist.filter(e => !have.has(`${e.krs}#${e.year}#${e.scope}`));
  console.log(`\nChecklist: ${checklist.length - missing.length} of ${checklist.length} here.` +
    (missing.length ? ` Still missing: ${missing.filter(m => !m.optional).length} required, ${missing.filter(m => m.optional).length} optional.` : ""));
  for (const m of missing.filter(m => !m.optional)) console.log(`  - ${m.company} (KRS ${m.krs}) FY${m.year} ${m.scope}`);

  if (mode === "report") {
    console.log(`\nNothing copied. Add --copy (or --move) to sort the statements into ${to}`);
    return;
  }
  mkdirSync(to, { recursive: true });
  let written = 0;
  for (const f of seen.values()) {
    const p = f.filing!;
    const ext = isZip(f.data) ? (extname(f.name).toLowerCase() === ".xbri" ? ".xbri" : ".zip") : extname(f.name).toLowerCase() || ".xml";
    const dir = join(to, (f.krs ?? "LEI-" + p.lei) + "-" + slug(p.companyName));
    mkdirSync(dir, { recursive: true });
    let dest = join(dir, `FY${f.year}-${p.scope}${ext}`);
    if (existsSync(dest) && sha(readFileSync(dest)) === f.sha) { console.log(`  = ${dest} (already there)`); continue; }
    for (let n = 2; existsSync(dest); n++) dest = join(dir, `FY${f.year}-${p.scope}-${n}${ext}`);
    if (f.fromZip) writeFileSync(dest, f.data);
    else if (mode === "move") {
      // a move to another drive can't be a rename (EXDEV on Windows or Linux)
      try { renameSync(f.source, dest); } catch { copyFileSync(f.source, dest); unlinkSync(f.source); }
    }
    else copyFileSync(f.source, dest);
    written++;
    console.log(`  → ${dest}`);
  }
  console.log(`\n${written} statement(s) ${mode === "move" ? "moved" : "copied"} to ${to}. Next: npm run import-filing -- --dry-run <files>, inside sst shell for the issuer match.`);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
