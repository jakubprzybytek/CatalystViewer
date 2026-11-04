# krs-reports

Download yearly financial reports from the Polish KRS Repository of Financial Documents ([rdf-przegladarka.ms.gov.pl](https://rdf-przegladarka.ms.gov.pl/wyszukaj-podmiot)).

Uses Playwright (real Chromium browser) to navigate the Angular SPA, bypass the Incapsula/Imperva WAF, and download all available financial documents for a given KRS number.

## Setup

```bash
cd tools/krs-reports
npm install
npx playwright install chromium
```

## Usage

```bash
# Downloads to ./krs-0000012345/
node download-krs-reports.mjs 12345

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

## How it works

1. Opens the KRS financial documents portal in a real browser
2. Enters the KRS number and submits the search
3. Intercepts the Angular app's backend API responses to find document metadata
4. Falls back to scraping download links from the page if API interception misses
5. Downloads all financial documents using the browser's authenticated session
6. Saves files (XML, XHTML, PDF) with descriptive names to the output directory

## Notes

- **Must run from a residential IP** — the site's WAF blocks datacenter/VPN IPs.
- **Use `--headed` the first time** — if the WAF presents a challenge or CAPTCHA, solve it once in the visible browser.
- If something goes wrong, the script saves `_debug_screenshot.png`, `_debug_page.html`, and `_debug_api_responses.json` to the output directory.
- Documents are typically XML (Polish Accounting Standards schema, 2018 or 2025 vintage), XHTML, or PDF. Pre-2018 filings are PDF scans.
