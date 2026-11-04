# krs-reports

Download yearly financial reports from the Polish KRS Repository of Financial Documents ([rdf-przegladarka.ms.gov.pl](https://rdf-przegladarka.ms.gov.pl/wyszukaj-podmiot)).

Uses Playwright (real Chromium browser) to navigate the Angular SPA, bypass the Incapsula/Imperva WAF, and download financial documents for a given KRS number.

By default it downloads only annual financial statements for the last 2 years, preferring consolidated (`Skonsolidowane roczne sprawozdanie finansowe`) over standalone (`Roczne sprawozdanie finansowe`).

## Setup

```bash
cd tools/krs-reports
npm install
npx playwright install chromium
```

## Usage

```bash
# Downloads last 2 years of annual statements to ./krs-0000012345/
node download-krs-reports.mjs 12345

# Last 3 years
node download-krs-reports.mjs 12345 --years 3

# Download all documents (no filtering)
node download-krs-reports.mjs 12345 --all

# Custom output directory
node download-krs-reports.mjs 0000012345 --out ~/Downloads/reports

# Show the browser (useful if WAF shows a CAPTCHA)
node download-krs-reports.mjs 12345 --headed
```

### Options

| Argument | Description |
|---|---|
| `<KRS_NUMBER>` | KRS number (up to 10 digits; leading zeros added automatically) |
| `--out <dir>` | Output directory (default: `./krs-<number>`) |
| `--headed` | Show the browser window for debugging or solving CAPTCHAs |
| `--years <N>` | How many most recent years to download (default: 2) |
| `--all` | Download all documents, not just annual financial statements |
| `--debug` | Save debug files (screenshot, HTML, API responses) to output dir |

## How it works

1. Opens the KRS financial documents portal in a real browser
2. Enters the KRS number and submits the search
3. Intercepts the Angular app's backend API responses to find document metadata
4. Falls back to scraping download links from the page if API interception misses
5. Filters for annual financial statements (consolidated preferred, standalone fallback)
6. Downloads using the browser's authenticated session
7. Saves files (XML, XHTML, PDF) with unique names to the output directory

## Notes

- **Must run from a residential IP** — the site's WAF blocks datacenter/VPN IPs.
- **Use `--headed` the first time** — if the WAF presents a challenge or CAPTCHA, solve it once in the visible browser.
- Use `--debug` to save `_api_responses.json`, `_debug_screenshot.png`, and `_debug_page.html` to the output directory — useful if field names change or something goes wrong.
- Documents are typically XML (Polish Accounting Standards schema, 2018 or 2025 vintage), XHTML, or PDF. Pre-2018 filings are PDF scans.
