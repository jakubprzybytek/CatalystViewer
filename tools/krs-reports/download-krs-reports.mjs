#!/usr/bin/env node
//
// Download yearly financial reports from the Polish KRS
// Repository of Financial Documents (rdf-przegladarka.ms.gov.pl)
//
// Usage:
//   node download-krs-reports.mjs <KRS_NUMBER> [--out <dir>] [--headed] [--years N] [--all]
//
// Setup (once):
//   cd tools/krs-reports
//   npm install
//   npx playwright install chromium
//

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function usage() {
  console.error(
    `Usage: node download-krs-reports.mjs <KRS_NUMBER> [options]

  <KRS_NUMBER>   KRS number (up to 10 digits; leading zeros added automatically)

Options:
  --out <dir>    Output directory (default: ./krs-<number>)
  --headed       Show the browser window (useful for CAPTCHAs or debugging)
  --years <N>    How many most recent years to download (default: 2)
  --all          Download all documents, not just annual financial statements
  --debug        Save debug files (screenshot, HTML, API responses) to output dir`
  );
  process.exit(1);
}

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") usage();

let krsRaw = null;
let outDir = null;
let headed = false;
let maxYears = 2;
let downloadAll = false;
let debug = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out" && args[i + 1]) {
    outDir = args[++i];
  } else if (a === "--headed") {
    headed = true;
  } else if (a === "--years" && args[i + 1]) {
    maxYears = parseInt(args[++i], 10);
    if (isNaN(maxYears) || maxYears < 1) {
      console.error("--years must be a positive integer");
      process.exit(1);
    }
  } else if (a === "--all") {
    downloadAll = true;
  } else if (a === "--debug") {
    debug = true;
  } else if (!krsRaw && /^\d{1,10}$/.test(a)) {
    krsRaw = a;
  } else {
    console.error(`Unknown argument: ${a}`);
    usage();
  }
}

if (!krsRaw) {
  console.error("Error: KRS number is required.");
  usage();
}

const krsNumber = krsRaw.padStart(10, "0");
outDir = resolve(outDir || `krs-${krsNumber}`);
if (!existsSync(outDir)) await mkdir(outDir, { recursive: true });

console.log(`KRS number : ${krsNumber}`);
console.log(`Output dir : ${outDir}`);
console.log(
  `Mode       : ${downloadAll ? "all documents" : `annual financial statements, last ${maxYears} year(s)`}`
);
console.log();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE = "https://rdf-przegladarka.ms.gov.pl";
const SEARCH_PAGE = `${BASE}/wyszukaj-podmiot`;
const NAV_TIMEOUT = 90_000;
const SEARCH_TIMEOUT = 60_000;

const CONSOLIDATED_RE = /skonsolidowane\s+roczne\s+sprawozdanie\s+finansowe/i;
const STANDALONE_RE = /^roczne\s+sprawozdanie\s+finansowe$/i;
const ANY_SPRAWOZDANIE_RE = /sprawozdanie\s+finansowe/i;

const RODZAJ_MAP = {
  "2": "Sprawozdanie finansowe (starszy format)",
  "3": "Uchwała lub postanowienie o zatwierdzeniu rocznego sprawozdania finansowego",
  "4": "Uchwała o podziale zysku bądź pokryciu straty",
  "5": "Sprawozdanie z działalności (starszy format)",
  "8": "Opinia biegłego rewidenta (starszy format)",
  "9": "Uchwała lub postanowienie o zatwierdzeniu skonsolidowanego rocznego sprawozdania finansowego",
  "10": "Skonsolidowane sprawozdanie finansowe (starszy format)",
  "11": "Sprawozdanie z działalności grupy kapitałowej (starszy format)",
  "18": "Roczne sprawozdanie finansowe",
  "19": "Opinia biegłego rewidenta / Sprawozdanie z badania rocznego sprawozdania finansowego",
  "20": "Sprawozdanie z działalności",
  "22": "Skonsolidowane roczne sprawozdanie finansowe",
  "23": "Opinia biegłego rewidenta / Sprawozdanie z badania skonsolidowanego rocznego sprawozdania finansowego grupy kapitałowej",
  "24": "Sprawozdanie z działalności grupy kapitałowej (wariant)",
  "26": "Sprawozdanie z atestacji sprawozdawczości zrównoważonego rozwoju",
  "34": "Sprawozdanie z działalności grupy kapitałowej",
  "36": "Raport na temat informacji niefinansowych",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitize(name) {
  return name
    .replace(/[/\\?%*:|"<>]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, 120);
}

function guessExt(contentType, body) {
  if (contentType.includes("xml") && !contentType.includes("xhtml")) return ".xml";
  if (contentType.includes("xhtml")) return ".xhtml";
  if (contentType.includes("pdf")) return ".pdf";
  if (contentType.includes("zip")) return ".zip";
  if (contentType.includes("html")) return ".html";
  if (body && body.length > 2) {
    const head = body.subarray(0, 4);
    if (head[0] === 0x3c) return ".xml";
    if (head[0] === 0x25 && head[1] === 0x50) return ".pdf";
    if (head[0] === 0x50 && head[1] === 0x4b) return ".zip";
  }
  return ".bin";
}

function uniquePath(dir, filename) {
  let candidate = join(dir, filename);
  if (!existsSync(candidate)) return candidate;

  const dot = filename.lastIndexOf(".");
  const base = dot > 0 ? filename.substring(0, dot) : filename;
  const ext = dot > 0 ? filename.substring(dot) : "";
  let n = 2;
  while (existsSync(join(dir, `${base}_${n}${ext}`))) n++;
  return join(dir, `${base}_${n}${ext}`);
}

function extractYear(value) {
  if (!value) return null;
  const m = String(value).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

// Walk an object to find a value for any of the given keys (case-insensitive)
function findField(obj, ...keys) {
  if (!obj || typeof obj !== "object") return undefined;
  const lower = keys.map((k) => k.toLowerCase());
  for (const [k, v] of Object.entries(obj)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  return undefined;
}

function getDocType(item) {
  const explicit = findField(
    item,
    "rodzajDokumentu",
    "typDokumentu",
    "type",
    "nazwa",
    "documentType",
    "name",
    "nazwaTypuDokumentu"
  );
  if (explicit) return explicit;

  const code = findField(item, "rodzaj");
  if (code != null && RODZAJ_MAP[String(code)]) return RODZAJ_MAP[String(code)];
  if (code != null) return `rodzaj:${code}`;

  return "";
}

function getYear(item) {
  return (
    extractYear(findField(item, "rokObrotowy", "fiscalYear")) ||
    extractYear(findField(item, "okresSprawozdawczyKoniec", "okresDo", "dataDo", "periodEnd", "do")) ||
    extractYear(findField(item, "okresSprawozdawczyPoczatek", "okresOd", "dataOd", "periodStart", "od")) ||
    null
  );
}

function getPeriod(item) {
  const from = findField(item, "okresSprawozdawczyPoczatek", "okresOd", "dataOd", "periodStart", "od") || "";
  const to = findField(item, "okresSprawozdawczyKoniec", "okresDo", "dataDo", "periodEnd", "do") || "";
  return { from: String(from), to: String(to) };
}

async function saveDebug(page, dir, apiResponses, apiRequests) {
  if (!debug) return;
  try {
    await page.screenshot({
      path: join(dir, "_debug_screenshot.png"),
      fullPage: true,
    });
    await writeFile(join(dir, "_debug_page.html"), await page.content());
  } catch {}
  const hasData = apiResponses.length > 0 || (apiRequests && apiRequests.length > 0);
  if (hasData) {
    try {
      await writeFile(
        join(dir, "_api_responses.json"),
        JSON.stringify({ requests: apiRequests || [], responses: apiResponses }, null, 2)
      );
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const browser = await chromium.launch({
  headless: !headed,
  args: ["--disable-blink-features=AutomationControlled"],
});

const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  locale: "pl-PL",
  timezoneId: "Europe/Warsaw",
  viewport: { width: 1280, height: 900 },
});

const page = await context.newPage();

const apiResponses = [];
const apiRequests = [];
page.on("request", (req) => {
  const url = req.url();
  if (url.includes("/services/")) {
    apiRequests.push({ url, method: req.method(), postData: req.postData() });
  }
});
page.on("response", async (res) => {
  const url = res.url();
  const ct = res.headers()["content-type"] || "";
  if (ct.includes("json") && url.includes("/services/")) {
    try {
      apiResponses.push({ url, status: res.status(), body: await res.json() });
    } catch {}
  }
});

try {
  // -------------------------------------------------------------------
  // 1. Navigate to the search page
  // -------------------------------------------------------------------
  console.log("Opening KRS financial documents portal...");
  await page.goto(SEARCH_PAGE, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT,
  });

  await page.waitForFunction(
    () =>
      document.querySelector("input") !== null ||
      document.querySelector("app-root") !== null,
    { timeout: NAV_TIMEOUT }
  );
  await page.waitForTimeout(3000);
  console.log("Page loaded.");

  // -------------------------------------------------------------------
  // 2. Enter KRS and search
  // -------------------------------------------------------------------
  const input = await findVisible(page, [
    'input[formcontrolname*="krs" i]',
    'input[formcontrolname*="numer" i]',
    'input[name*="krs" i]',
    'input[id*="krs" i]',
    'input[placeholder*="KRS" i]',
    'input[placeholder*="numer" i]',
    "input[type=text]",
    "input[type=search]",
    "input:not([type=hidden])",
  ]);

  if (!input) {
    await saveDebug(page, outDir, apiResponses, apiRequests);
    die("Could not find the search input. Try --headed or --debug.");
  }

  await input.click({ clickCount: 3 });
  await input.fill(krsNumber);
  await page.waitForTimeout(500);

  const btn = await findVisible(page, [
    'button[type="submit"]',
    'button:has-text("Szukaj")',
    'button:has-text("Wyszukaj")',
    "button.btn-primary",
  ]);

  if (btn) {
    await btn.click();
  } else {
    await input.press("Enter");
  }

  console.log("Search submitted. Waiting for results...");
  await page
    .waitForLoadState("networkidle", { timeout: SEARCH_TIMEOUT })
    .catch(() => {});
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------------
  // 3. Collect document metadata
  // -------------------------------------------------------------------
  let allDocuments = await collectFromApi(apiResponses, apiRequests, page);

  if (allDocuments.length === 0) {
    allDocuments = await collectFromPage(page, outDir);
  }

  // Always save API responses for debugging / field-name discovery
  await saveDebug(page, outDir, apiResponses, apiRequests);

  if (allDocuments.length === 0) {
    await saveDebug(page, outDir, apiResponses, apiRequests);
    die(
      `No documents found for KRS ${krsNumber}.\n` +
        "Possible reasons:\n" +
        "  - The company has no financial documents in the KRS repository\n" +
        "  - The portal structure may have changed\n" +
        "  - WAF blocked the request (try --headed or --debug)"
    );
  }

  // -------------------------------------------------------------------
  // 4. Filter documents
  // -------------------------------------------------------------------
  let documents;

  if (downloadAll) {
    documents = allDocuments;
    console.log(`\n${documents.length} document(s) selected (--all).`);
  } else {
    documents = filterAnnualReports(allDocuments, maxYears);
  }

  if (documents.length === 0) {
    console.log("\nAll available documents:");
    for (const doc of allDocuments) {
      console.log(
        `  - [${doc.year || "?"}] ${doc.type || "(no type)"} — ${doc.label}`
      );
    }
    die(
      `\nNo matching annual financial statements found for the last ${maxYears} year(s).\n` +
        "Use --all to download everything, or check _api_responses.json for the raw metadata."
    );
  }

  // -------------------------------------------------------------------
  // 5. Download
  // -------------------------------------------------------------------
  console.log(`\nDownloading ${documents.length} document(s)...\n`);

  let downloaded = 0;
  const seen = new Set();

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc.url) continue;
    if (seen.has(doc.url)) continue;
    seen.add(doc.url);

    const label = doc.label || `document_${i + 1}`;
    process.stdout.write(`  [${i + 1}/${documents.length}] ${label} ... `);

    try {
      const resp = await page.request.get(doc.url, { timeout: 120_000 });
      if (!resp.ok()) {
        console.log(`HTTP ${resp.status()} — skipped`);
        continue;
      }

      const ct = resp.headers()["content-type"] || "";
      const cd = resp.headers()["content-disposition"] || "";
      const body = await resp.body();

      let filename = "";
      const cdMatch = cd.match(/filename[*]?=(?:UTF-8''|"?)([^";]+)/i);
      if (cdMatch) {
        filename = sanitize(decodeURIComponent(cdMatch[1]));
      }
      if (!filename) {
        filename = sanitize(label) + guessExt(ct, body);
      }

      const filePath = uniquePath(outDir, filename);
      await writeFile(filePath, body);
      const savedName = filePath.split("/").pop();
      console.log(`${(body.length / 1024).toFixed(1)} KB → ${savedName}`);
      downloaded++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\nDone. ${downloaded}/${seen.size} document(s) saved to ${outDir}`);
} catch (err) {
  await saveDebug(page, outDir, apiResponses, apiRequests);
  console.error(`\nFatal: ${err.message}`);
  console.error("Try --headed or --debug.");
  process.exit(1);
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// Filtering: pick annual financial statements for the last N years
// ---------------------------------------------------------------------------

function filterAnnualReports(allDocs, years) {
  const consolidated = [];
  const standalone = [];
  const otherSprawozdanie = [];

  console.log(`\n${allDocs.length} total document(s). Filtering for annual financial statements...\n`);

  for (const doc of allDocs) {
    const t = doc.type || "";
    console.log(`  [${doc.year || "?"}] ${t || "(no type)"}`);

    if (CONSOLIDATED_RE.test(t)) {
      consolidated.push(doc);
    } else if (STANDALONE_RE.test(t)) {
      standalone.push(doc);
    } else if (ANY_SPRAWOZDANIE_RE.test(t)) {
      otherSprawozdanie.push(doc);
    }
  }

  // Per-year: prefer consolidated, then standalone, then any sprawozdanie
  const byYear = new Map();
  const sources = [consolidated, standalone, otherSprawozdanie];
  for (const group of sources) {
    for (const doc of group) {
      if (doc.year && !byYear.has(doc.year)) {
        byYear.set(doc.year, doc);
      }
    }
  }

  if (byYear.size === 0) {
    console.log("\n  No typed matches found.");
    return [];
  }

  const sorted = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, years);

  console.log();
  for (const [year, doc] of sorted) {
    const kind = CONSOLIDATED_RE.test(doc.type || "")
      ? "consolidated"
      : STANDALONE_RE.test(doc.type || "")
        ? "standalone"
        : "other";
    console.log(`  -> ${year}: ${kind} (${doc.type})`);
  }

  return sorted.map(([, doc]) => doc);
}

// ---------------------------------------------------------------------------
// Document collection: API interception
// ---------------------------------------------------------------------------

function parseItems(data) {
  const items =
    data.dokumenty ||
    data.content ||
    data.items ||
    data.results ||
    data.data ||
    (Array.isArray(data) ? data : null);

  if (!items || !Array.isArray(items)) return [];

  const docs = [];
  for (const item of items) {
    const docId =
      findField(item, "id", "dokumentId", "docId") ||
      (item.id != null ? item.id : null);
    if (docId == null) continue;

    const type = getDocType(item);
    const year = getYear(item);
    const period = getPeriod(item);
    const label = [type || "sprawozdanie", period.from, period.to]
      .filter(Boolean)
      .join("_");

    docs.push({
      url: `${BASE}/services/rdf/przegladarka-dokumentow-finansowych/dokumenty/${docId}/tresc?bezPodpisu=false`,
      label,
      docId,
      type,
      year,
      raw: item,
    });
  }
  return docs;
}

async function collectFromApi(apiResponses, apiRequests, page) {
  const docs = [];
  let searchPostData = null;
  let totalPages = 1;

  for (const resp of apiResponses) {
    if (resp.status !== 200 || !resp.body) continue;
    docs.push(...parseItems(resp.body));

    const meta = resp.body.metadaneWynikow;
    if (meta && meta.liczbaStron > 1) {
      totalPages = meta.liczbaStron;
    }
  }

  if (totalPages > 1 && apiRequests) {
    for (const req of apiRequests) {
      if (req.url.includes("dokumenty/wyszukiwanie") && req.postData) {
        searchPostData = req.postData;
        break;
      }
    }
  }

  if (totalPages > 1 && searchPostData) {
    console.log(`API returned page 1/${totalPages} (${docs.length} docs). Fetching remaining pages...`);
    const basePayload = JSON.parse(searchPostData);

    for (let pg = 1; pg < totalPages; pg++) {
      basePayload.metadaneStronicowania.numerStrony = pg;
      try {
        const resp = await page.request.post(
          `${BASE}/services/rdf/przegladarka-dokumentow-finansowych/dokumenty/wyszukiwanie`,
          { data: basePayload, timeout: 30_000 }
        );
        if (resp.ok()) {
          const body = await resp.json();
          const pageDocs = parseItems(body);
          docs.push(...pageDocs);
          process.stdout.write(`  page ${pg + 1}/${totalPages}: ${pageDocs.length} docs\n`);
        }
      } catch (err) {
        console.log(`  page ${pg + 1}/${totalPages}: failed (${err.message})`);
      }
    }
  }

  if (docs.length > 0) {
    console.log(`Found ${docs.length} document(s) via API interception.`);
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Document collection: page scraping fallback
// ---------------------------------------------------------------------------

async function collectFromPage(page, debugDir) {
  const docs = [];

  const entitySelectors = [
    "a[href*=podmiot]",
    "a[href*=entity]",
    ".result a",
    ".list-group-item a",
    "table a",
    "tr a",
  ];

  for (const sel of entitySelectors) {
    const link = await page.$(sel);
    if (link && (await link.isVisible().catch(() => false))) {
      console.log("Navigating to entity detail page...");
      await link.click();
      await page
        .waitForLoadState("networkidle", { timeout: SEARCH_TIMEOUT })
        .catch(() => {});
      await page.waitForTimeout(3000);
      break;
    }
  }

  // Expand collapsed sections
  const expandables = await page.$$(
    'button[aria-expanded="false"], details:not([open]) summary, [class*="expand"], [class*="toggle"], .accordion-button.collapsed'
  );
  for (const el of expandables) {
    try {
      await el.click();
      await page.waitForTimeout(800);
    } catch {}
  }
  await page.waitForTimeout(1000);

  const allLinks = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: a.href,
      text: (a.textContent || "").trim().substring(0, 200),
      download: a.getAttribute("download") || "",
      ariaLabel: a.getAttribute("aria-label") || "",
      context: (() => {
        let el = a.parentElement;
        for (let i = 0; i < 5 && el; i++) {
          const t = el.textContent || "";
          if (t.length > (a.textContent || "").length + 10 && t.length < 500)
            return t.trim();
          el = el.parentElement;
        }
        return "";
      })(),
    }))
  );

  for (const link of allLinks) {
    const isDoc =
      link.href.includes("tresc") ||
      link.href.includes("download") ||
      link.href.includes("dokument") ||
      link.text.toLowerCase().includes("pobierz") ||
      link.ariaLabel.toLowerCase().includes("pobierz") ||
      link.download;

    if (isDoc) {
      const ctx = link.context || "";

      let type = "";
      if (CONSOLIDATED_RE.test(ctx))
        type = "Skonsolidowane roczne sprawozdanie finansowe";
      else if (STANDALONE_RE.test(ctx))
        type = "Roczne sprawozdanie finansowe";
      else if (ANY_SPRAWOZDANIE_RE.test(ctx)) type = "Sprawozdanie finansowe";

      const yearMatch = ctx.match(/20[12]\d/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;

      const label = [
        type || link.download || link.text || link.ariaLabel || "document",
        year,
      ]
        .filter(Boolean)
        .join("_");

      docs.push({ url: link.href, label: sanitize(label), type, year });
    }
  }

  // Fallback: trigger actual downloads via button clicks
  if (docs.length === 0) {
    const downloadBtns = await page.$$(
      'button:has-text("Pobierz"), button:has-text("pobierz dokument"), a:has-text("Pobierz dokument")'
    );

    for (let i = 0; i < downloadBtns.length; i++) {
      try {
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 15000 }),
          downloadBtns[i].click(),
        ]);

        const suggestedName =
          download.suggestedFilename() || `document_${i + 1}`;
        const filePath = uniquePath(debugDir, sanitize(suggestedName));
        await download.saveAs(filePath);
        console.log(`  Downloaded via button: ${suggestedName}`);
      } catch {}
    }
  }

  if (docs.length > 0) {
    console.log(`Found ${docs.length} document link(s) on the page.`);
  }
  return docs;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

async function findVisible(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el && (await el.isVisible().catch(() => false))) return el;
  }
  return null;
}

function die(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}
