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
import { readPdfPages } from "../../packages/core/src/bonds/fundamentals/filings/pdfText";
import { findKrs, findLei } from "../../packages/core/src/bonds/fundamentals/filings/AiPdfExtractor";

// scope "any": group accounts if the company files them, else its own (small companies often have no group)
type Expected = { company: string; krs: string; year: number; scope: "single" | "group" | "any"; optional?: boolean };

// A statement found: a file, or an entry of a zip that isn't itself an ESEF package
type Candidate = { source: string; name: string; data: Buffer; fromZip?: string };

type Found = Candidate & {
  kind: "statement" | "pdf" | "skipped" | "unreadable";
  reason?: string;
  filing?: ParsedFiling;
  krs?: string;
  lei?: string;
  company?: string;
  scope?: "single" | "group";
  year?: number;
  months?: number;
  sha?: string;
  text?: string;   // a PDF's text, for finding its company when no KRS number is printed
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

// A PDF isn't parsed (the statements are read by a model on import), but its text tells, for free, whose it is
// and which year: the KRS number or LEI, the fiscal year end, whether it's the group's.
const MONTH_END = /\b(3[01])(?:[.\-/ ]+)(12|grudnia|december|0?9|wrze[sś]nia|september|0?6|czerwca|june|0?3|marca|march)(?:[.\-/ ]+)(20\d\d)\b/i;
async function pdfFacts(c: Candidate): Promise<Partial<Found>> {
  try {
    const all = await readPdfPages(c.data);
    const pages = all.slice(0, 6);
    const text = pages.map(p => p.lines.join(" ")).join(" ");
    const year = Number(text.match(MONTH_END)?.[3] ?? c.name.match(/(?:za rok|rok obrotowy|FY|_)\s*(20\d\d)/i)?.[1]) || undefined;
    const group = /skonsolidowan|consolidated/i.test(c.name + " " + text.slice(0, 4000));
    const lei = findLei(pages) ?? findLei(all);
    return { krs: findKrs(pages) ?? findKrs(all) ?? (lei ? await krsOfLei(lei) : undefined), lei, year, scope: group ? "group" : "single",
      text: all.map(p => p.lines.join(" ")).join(" ") };
  } catch (e) {
    return { reason: "its text can't be read: " + (e as Error).message.slice(0, 80) };
  }
}

// Signals that a file carries a statement even if it couldn't be parsed
const STATEMENT_HINT = /Jednostka(Inna|Mala|Mikro)|Skonsolidowan|SprawozdanieFinansowe|Bilans/;

async function examine(c: Candidate): Promise<Found> {
  const kb = Math.round(c.data.length / 1024);
  if (SKIP.test(c.name) || !STATEMENT.test(c.name) && !isZip(c.data)) return { ...c, kind: "skipped", reason: "not a statement file" };
  if (/\.pdf$/i.test(c.name) || c.data.subarray(0, 5).toString() === "%PDF-") return { ...c, kind: "pdf", sha: sha(c.data), ...(await pdfFacts(c)) };
  try {
    const { filing } = readFiling(c.data, c.name);
    const current = filing.periods[0];
    const krs = filing.krs?.padStart(10, "0") ?? (filing.lei ? await krsOfLei(filing.lei) : undefined);
    return { ...c, kind: "statement", filing, krs, lei: filing.lei, company: filing.companyName, scope: filing.scope,
      year: Number(current.periodEnd.slice(0, 4)), months: current.months, sha: sha(c.data) };
  } catch (e) {
    const message = (e as Error).message.split("\n")[0].slice(0, 160);
    const text = c.data.subarray(0, 2_000_000).toString("utf-8");
    // a signature file is skipped only when nothing in it looks like a statement
    if (/\.xades$/i.test(c.name) && !STATEMENT_HINT.test(text) && kb < 64) return { ...c, kind: "skipped", reason: `a signature only, ${kb} KB` };
    return { ...c, kind: "unreadable", reason: `${message} (${kb} KB${STATEMENT_HINT.test(text) ? ", looks like it holds a statement: please send this file" : ""})` };
  }
}

const decoded = (n: string) => { try { return decodeURIComponent(n); } catch { return n; } };
const label = (f: Candidate) => (f.fromZip ? f.fromZip + " › " + decoded(f.name) : decoded(f.name));
const sha = (d: Buffer) => createHash("sha256").update(d).digest("hex");
const millions = (v?: number) => (v === undefined ? "—" : (v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 }));
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L")
  .replace(/^(Grupa Kapitalowa|Grupa Kapitałowa|GK)\s+/i, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const scopeName = (s?: string) => (s === "group" ? "group" : s === "single" ? "single company" : "scope ?");

async function main() {
  const { folder, to, mode } = parseArgs(process.argv.slice(2));
  if (!existsSync(folder)) throw new Error(`No such folder: ${folder}`);
  // esrun runs a temporary copy of this file: __dirname is this folder on Linux but the project root on Windows
  const checklistPath = [join(__dirname, "checklist.json"), join(__dirname, "scripts", "sort-filings", "checklist.json"),
    join(process.cwd(), "scripts", "sort-filings", "checklist.json")].find(p => existsSync(p));
  if (!checklistPath) throw new Error("checklist.json not found: run from the repository root");
  const checklist: Expected[] = JSON.parse(readFileSync(checklistPath, "utf-8"));
  const companyOf = (krs?: string) => checklist.find(e => e.krs === krs)?.company;
  const scopeFits = (e: Expected, scope?: string) => e.scope === "any" || e.scope === scope;

  const found: Found[] = [];
  for (const c of candidates(folder, to)) found.push(await examine(c));
  // A PDF without a KRS number: the checklist company whose KRS number or name its text gives (just one)
  const plain = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/gi, "l").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const nameCore = (n: string) => plain(n).replace(/\b(s a|sa|se|sp z o o|spolka akcyjna|grupa kapitalowa)\b/g, " ").trim();
  for (const f of found) {
    if (f.kind !== "pdf" || f.krs || !f.text) continue;
    const t = " " + plain(f.text) + " ";
    const hits = [...new Set(checklist.filter(e => f.text!.includes(e.krs) || t.includes(" " + nameCore(e.company) + " ")).map(e => e.krs))];
    if (hits.length === 1) { f.krs = hits[0]; f.reason = "company found by its name or number in the text (no KRS line)"; }
  }
  const usable = found.filter(f => f.kind === "statement" || f.kind === "pdf");

  console.log(`\n${folder}: ${found.length} file(s), ${found.filter(f => f.kind === "statement").length} statement(s), ${found.filter(f => f.kind === "pdf").length} PDF(s)\n`);
  const seen = new Map<string, Found>();      // first file per company, year and scope
  const bySha = new Map<string, Found>();
  const keep: Found[] = [];
  for (const f of found) {
    const where = label(f);
    if (f.kind === "skipped") { console.log(`  · ${where}: skipped (${f.reason})`); continue; }
    if (f.kind === "unreadable") { console.log(`  ✗ ${where}: can't be read: ${f.reason}`); continue; }
    const p = f.filing;
    const company = p?.companyName ?? companyOf(f.krs) ?? "company ?";
    const same = f.sha ? bySha.get(f.sha) : undefined;
    const key = f.krs && f.year && f.scope ? `${f.krs}#${f.year}#${f.scope}` : undefined;
    const dup = key ? seen.get(key) : undefined;
    const exp = checklist.find(e => e.krs === f.krs && e.year === f.year);
    const other = exp ? undefined : checklist.find(e => e.krs === f.krs);
    const flags = [
      p?.checks.length ? `checks failed: ${p.checks.join("; ")}` : "",
      p && f.months !== 12 ? `${f.months}-month period, not a full year` : "",
      same ? "identical to " + label(same) : dup ? "same company, year and scope as " + label(dup) + ": keep the better one" : "",
      exp && f.scope && !scopeFits(exp, f.scope) ? (exp.scope === "group"
        ? "the checklist asks for the group report (Skonsolidowane): take it if the company files one"
        : "the checklist asks for the single-company report") : "",
      !f.krs ? "no KRS number found" + (f.lei ? " (LEI " + f.lei + " not in the KRS, or GLEIF unreachable)" : "") : "",
      f.kind === "pdf" && !f.year ? "fiscal year not found in the text" : "",
      f.kind === "pdf" && /draft|projekt/i.test(f.name) ? "the file name says draft: check it's the final, audited version" : "",
    ].filter(Boolean);
    const notes = [
      f.kind === "pdf" ? "PDF: read by the model on import (~$0.15); the figures aren't checked here" : "",
      !exp && other && f.year ? (f.year < other.year ? `an earlier year than the checklist's FY${other.year}: adds history` : `a later year than the checklist's FY${other.year}`) : "",
      !exp && !other && f.krs ? "not on the checklist: fine to import if it's newer than what the app has" : "",
    ].filter(Boolean);
    if (f.sha && !same) bySha.set(f.sha, f);
    if (key && !dup) seen.set(key, f);
    if (!same && !dup) keep.push(f);
    console.log(`  ${flags.length ? "!" : f.kind === "pdf" ? "?" : "✓"} ${where}`);
    console.log("      " + [company, "KRS " + (f.krs ?? "?"), ...(f.lei ? ["LEI " + f.lei] : []), scopeName(f.scope),
      f.year ? (p ? "FY ending " + p.periods[0].periodEnd : "FY" + f.year) : "year ?", p ? p.format + ", " + p.currency : "pdf"].join(" · "));
    if (p) {
      const cur = p.periods[0];
      console.log(`      revenue ${millions(cur.figures.revenue?.value)} m · net profit ${millions(cur.figures.netProfit?.value)} m · total assets ${millions(cur.figures.totalAssets?.value)} m · ${p.periods.length} year(s) in the file`);
    }
    if (f.reason) console.log("      · " + f.reason);
    for (const fl of flags) console.log("      ! " + fl);
    for (const n of notes) console.log("      · " + n);
  }

  // What the checklist still needs (a PDF counts: it can be imported, at a model call's cost)
  const missing = checklist.filter(e => !usable.some(f => f.krs === e.krs && f.year === e.year && scopeFits(e, f.scope)));
  console.log(`\nChecklist: ${checklist.length - missing.length} of ${checklist.length} here.` +
    (missing.length ? ` Still missing: ${missing.filter(m => !m.optional).length} required, ${missing.filter(m => m.optional).length} optional.` : ""));
  for (const m of missing.filter(m => !m.optional)) console.log(`  - ${m.company} (KRS ${m.krs}) FY${m.year} ${m.scope === "any" ? "group, or single if none" : m.scope}`);

  if (mode === "report") {
    console.log(`\nNothing copied. Add --copy (or --move) to sort the files into ${to}`);
    return;
  }
  mkdirSync(to, { recursive: true });
  let written = 0;
  for (const f of keep) {
    const company = f.filing?.companyName ?? companyOf(f.krs) ?? "unknown";
    const ext = f.kind === "pdf" ? ".pdf" : isZip(f.data) ? (extname(f.name).toLowerCase() === ".xbri" ? ".xbri" : ".zip") : extname(f.name).toLowerCase() || ".xml";
    const dir = join(to, f.krs || f.lei ? (f.krs ?? "LEI-" + f.lei) + "-" + slug(company) : "unknown");
    mkdirSync(dir, { recursive: true });
    const stem = f.year ? `FY${f.year}-${f.scope ?? "scope"}` : basename(f.name, extname(f.name));
    let dest = join(dir, stem + ext);
    if (existsSync(dest) && sha(readFileSync(dest)) === f.sha) { console.log(`  = ${dest} (already there)`); continue; }
    for (let n = 2; existsSync(dest); n++) dest = join(dir, `${stem}-${n}${ext}`);
    if (f.fromZip) writeFileSync(dest, f.data);
    else if (mode === "move") {
      // a move to another drive can't be a rename (EXDEV on Windows or Linux)
      try { renameSync(f.source, dest); } catch { copyFileSync(f.source, dest); unlinkSync(f.source); }
    }
    else copyFileSync(f.source, dest);
    written++;
    console.log(`  → ${dest}`);
  }
  console.log(`\n${written} file(s) ${mode === "move" ? "moved" : "copied"} to ${to}. Next: npm run import-filing -- --dry-run <files>, inside sst shell for the issuer match.`);
}

// exit explicitly: the PDF reader can leave handles open, which hangs the runner (esrun) at the end
main().then(() => process.exit(0), e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
