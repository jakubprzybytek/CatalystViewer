#!/usr/bin/env node
//
// Download yearly financial reports from the Polish KRS
// Repository of Financial Documents (rdf-przegladarka.ms.gov.pl)
//
// Usage:
//   node download-krs-reports.mjs <KRS_NUMBER> [--out <dir>] [--headed]
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
    `Usage: node download-krs-reports.mjs <KRS_NUMBER> [--out <dir>] [--headed]

  <KRS_NUMBER>   KRS number (up to 10 digits; leading zeros added automatically)
  --out <dir>    Output directory (default: ./krs-<number>)
  --headed       Show the browser window (useful for CAPTCHAs or debugging)`
  );
  process.exit(1);
}

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") usage();

let krsRaw = null;
let outDir = null;
let headed = false;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out" && args[i + 1]) {
    outDir = args[++i];
  } else if (a === "--headed") {
    headed = true;
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
console.log(`Output dir : ${outDir}\n`);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE = "https://rdf-przegladarka.ms.gov.pl";
const SEARCH_PAGE = `${BASE}/wyszukaj-podmiot`;
const NAV_TIMEOUT = 90_000;
const SEARCH_TIMEOUT = 60_000;

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
    if (head[0] === 0x3c) return ".xml"; // '<'
    if (head[0] === 0x25 && head[1] === 0x50) return ".pdf"; // '%P'
    if (head[0] === 0x50 && head[1] === 0x4b) return ".zip"; // 'PK'
  }
  return ".bin";
}

async function saveDebug(page, dir, apiResponses) {
  try {
    await page.screenshot({ path: join(dir, "_debug_screenshot.png"), fullPage: true });
    await writeFile(join(dir, "_debug_page.html"), await page.content());
    if (apiResponses.length > 0) {
      await writeFile(
        join(dir, "_debug_api_responses.json"),
        JSON.stringify(apiResponses, null, 2)
      );
    }
  } catch {}
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

// Collect every JSON API response from the backend
const apiResponses = [];
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
  await page.goto(SEARCH_PAGE, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

  // Wait for Angular to bootstrap
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
    await saveDebug(page, outDir, apiResponses);
    die("Could not find the search input. Debug files saved. Try --headed.");
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
  await page.waitForLoadState("networkidle", { timeout: SEARCH_TIMEOUT }).catch(() => {});
  await page.waitForTimeout(3000);

  // -------------------------------------------------------------------
  // 3. Collect document metadata (API interception + page scraping)
  // -------------------------------------------------------------------
  let documents = collectFromApi(apiResponses);

  if (documents.length === 0) {
    // Try clicking through to the entity detail page
    documents = await collectFromPage(page, outDir);
  }

  if (documents.length === 0) {
    await saveDebug(page, outDir, apiResponses);
    die(
      `No documents found for KRS ${krsNumber}.\n` +
        "Possible reasons:\n" +
        "  - The company has no financial documents in the KRS repository\n" +
        "  - The portal structure may have changed\n" +
        "  - WAF blocked the request (try --headed)\n" +
        "Debug files saved."
    );
  }

  // -------------------------------------------------------------------
  // 4. Download each document
  // -------------------------------------------------------------------
  console.log(`\nFound ${documents.length} document(s). Downloading...\n`);

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

      const filePath = join(outDir, filename);
      await writeFile(filePath, body);
      console.log(`${(body.length / 1024).toFixed(1)} KB → ${filename}`);
      downloaded++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log(`\nDone. ${downloaded}/${seen.size} document(s) saved to ${outDir}`);
} catch (err) {
  await saveDebug(page, outDir, apiResponses);
  console.error(`\nFatal: ${err.message}`);
  console.error("Debug files saved. Try --headed.");
  process.exit(1);
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// Document collection strategies
// ---------------------------------------------------------------------------

function collectFromApi(apiResponses) {
  const docs = [];

  for (const resp of apiResponses) {
    if (resp.status !== 200 || !resp.body) continue;
    const data = resp.body;

    // Try various response shapes
    const items =
      data.dokumenty ||
      data.content ||
      data.items ||
      data.results ||
      data.data ||
      (Array.isArray(data) ? data : null);

    if (!items || !Array.isArray(items)) continue;

    for (const item of items) {
      const docId = item.id || item.dokumentId || item.docId;
      if (!docId) continue;

      const period =
        item.okresOd || item.rokObrotowy || item.period || item.dataOd || "";
      const periodEnd = item.okresDo || item.dataDo || "";
      const type =
        item.rodzajDokumentu ||
        item.typDokumentu ||
        item.type ||
        item.nazwa ||
        "sprawozdanie";

      const label = [type, period, periodEnd].filter(Boolean).join("_");

      docs.push({
        url: `${BASE}/services/rdf/przegladarka-dokumentow-finansowych/dokumenty/${docId}/tresc?bezPodpisu=false`,
        label,
        docId,
      });
    }
  }

  if (docs.length > 0) {
    console.log(`Found ${docs.length} document(s) via API interception.`);
  }
  return docs;
}

async function collectFromPage(page, debugDir) {
  const docs = [];

  // First: see if there's an entity link to click through
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

  // Expand all collapsed sections
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

  // Gather all links that look like document downloads
  const allLinks = await page.$$eval("a[href]", (els) =>
    els.map((a) => ({
      href: a.href,
      text: (a.textContent || "").trim().substring(0, 200),
      download: a.getAttribute("download") || "",
      ariaLabel: a.getAttribute("aria-label") || "",
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
      const label = link.download || link.text || link.ariaLabel || "document";
      docs.push({ url: link.href, label: sanitize(label) });
    }
  }

  // Also check for Playwright download triggers (buttons that trigger file downloads)
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

        const suggestedName = download.suggestedFilename() || `document_${i + 1}`;
        const filePath = join(debugDir, "..", sanitize(suggestedName));
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
