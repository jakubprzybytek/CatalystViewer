# Fundamental Analysis v2: Audit and Roadmap

**Date:** 2026-10-29
**Status:** Proposal. Phase 0 implemented (2026-10-29). Phase 1 started (2026-10-30): filings are imported by hand, see [Phase 1 scope](#phase-1-scope); IFRS reporters added 2026-10-31. Phase 1b in progress: items 1 (corpus, 32 hand-checked reports), 2 (AI extraction for PDFs), 3 (statement lines) and 4 (issuer identity) done; next: 6 (overrides), 5 (import page). See [Phase 1b](#phase-1b-scope-report-import-for-every-format).
**Builds on:** [2026-05-11-fundamental-analysis-design.md](2026-05-11-fundamental-analysis-design.md)

---

## Summary

The scorecard framework (6 dimensions, traffic lights, no aggregate score) is a sound starting point, but its inputs are unreliable: an LLM agent collects figures from stockwatch.pl, biznesradar.pl or web search and retypes them by hand, with no check against the source. Most Catalyst issuers are not listed on GPW, so they fall back to web search and end up mostly `n/a`.

The direction proposed here: **get the numbers deterministically from official filings, use the LLM for what code can't do (notes, covenants, red flags, narrative), and join fundamentals with the market data the app already has.** The goal moves from "colour some ratios" to "which bonds pay well for their risk, and what changed since the last report".

---

## Audit findings (state on 2026-10-29)

### Analysis

1. **Part-year scored as a full year.** `StockwatchTool` sums whatever quarters exist and labels the result as a year; the scorecard rates the newest year. Dadelo's "2026" was Q1 only (revenue 143 vs 444 for 2025), giving Net Debt/EBITDA 11.1× → Debt Burden red.
2. **No data shows as yellow.** Financial Trend with ≥3 years but all metrics `n/a` came out yellow (Arche S.A.). A single available metric could also decide a dimension, with nothing telling the user that data was thin.
3. **The LLM retypes ~70 numbers** and converts thousands → millions by hand (pointless: ratios don't depend on units). No check against tool output, no sanity checks (does the balance sheet add up?). Stockwatch takes the first search hit; the prompt and both tool descriptions each name a different "preferred" source; "max 5 tool calls" isn't enforced (Anwim and Arche used 12).
4. **Out-of-scope issuers were scored.** The design excludes financial institutions, but `selectIssuers` takes every corporate-bond issuer (e.g. Best S.A., a debt collector, got a full card).
5. **One set of thresholds for every sector.** Developers (most of Catalyst) hold flats and land as inventory, so the quick ratio is always red (Archicom 0.25×).
6. **Missing for bondholders:** cash flow (operating cash flow, free cash flow), debt maturity vs cash, security, covenants, auditor's opinion. Group vs single-company accounts and minority interests are left to the model.
7. **Formulas:** Asset Coverage takes away all current liabilities (including short-term debt) while also counting that debt in the denominator; "interest expense" is in practice total finance costs.

### Storage (`IssuerProfiles` table)

- Each run is stored ~4 times: the markdown report repeats the raw tool output that is also in `agentLog`, written to both `#ANALYSIS#<ts>` and `#LATEST_ANALYSIS`. Records are already 30–94 KB; DynamoDB's item limit is 400 KB.
- The profiles API and issuer selection scan the whole table with a filter, so read cost grows with every history row.
- The scorecard is stored as computed at run time; rule changes don't reach old results.
- The two writes aren't atomic; `getAnalysisHistory` is unused.

### Presentation

- 6-dot badge on the issuer card, a dimension grid with tooltips, and a modal with a Markdown tab and an Agent Logs tab. The report ends with the same raw tool output as the logs.
- Not shown: which year is rated, part-year or not, group or single-company, data completeness, source links, previous runs.
- The email only lists which issuers succeeded or failed.

### Other

- `TAVILY_API_KEY` reaches the Lambdas as a plain environment variable (fallback `"x"`); the owner's standard prefers SST secrets.
- Any signed-in user can start paid runs, with no duplicate check or rate limit.

---

## Proposal

### 1. Deterministic financial data

- **KRS financial filings repository (Repozytorium Dokumentów Finansowych).** Since 2018 companies file annual accounts with the court register, mostly as structured XML under the Polish accounting act. Each line item has a fixed position code, so it maps to our fields in code, with no LLM. Covers the private Sp. z o.o. and S.A. issuers that make up most of Catalyst.
- **ESEF (tagged XBRL)** for GPW-listed IFRS reporters.
- **Stockwatch / Biznesradar** as fallback, parsed in code, complete years only.
- **Issuers keyed by KRS number**, not name. The LLM's only job here: match the issuer name to a KRS number, checked once and stored on the profile.
- Every number records its source document, period, scope (group or single company) and accounting standard.

**Risk to check first:** automated access to the KRS repository (captcha, rate limits). Test on 5 issuers before building on it.

**Result (2026-10-30):** no automated access. The repository has no public API, and its browser (rdf-przegladarka.ms.gov.pl) is behind Imperva bot protection. The KRS register API (api-krs.ms.gov.pl: name, NIP, REGON for a KRS number) is open. Options were a paid API (MGBI, Transparent Data), asking the Ministry of Justice, or downloading by hand; phase 1 goes with downloading by hand.

### 2. A different job for the LLM

From the notes, the information memorandum and EBI reports:

- the debt maturity schedule;
- covenants, collateral, guarantees, ranking of the bonds;
- the auditor's opinion (qualifications, going-concern emphasis, auditor changes);
- red flags: related-party transactions, large one-offs, an annual report filed late;
- a short narrative with citations.

Every extracted item comes with a quote, and code checks that a quoted number appears in the source. The final answer goes through a tool call with a fixed schema, instead of searching the reply text for `{ … }`.

### 3. Scoring framework v2

- **Rules per sector**, driven by the existing industry classification:
  - *Developer:* net debt / inventory, cash plus buyer-deposit (escrow) accounts against debt due in 12–24 months, pre-sales, equity ratio; no quick ratio.
  - *Finance* (debt collectors, leasing, factoring): equity / assets, cash-based EBITDA, collections coverage, funding mix. See [Finance subcategories](#finance-subcategories).
  - *Holding companies:* single-company vs group; the holding's bondholders rank behind the subsidiaries' creditors, so that is flagged.
  - *Municipal, state, banks:* excluded or handled separately.
- **Finance subcategories.** See the subsection below.
- **Cash flow:** operating cash flow, free cash flow, operating cash flow / debt, capital expenditure.
- **Upcoming bond maturities vs cash.** `BondDetails` already holds each issuer's bonds, amounts and maturity dates. Bonds due in 12/24 months vs cash + expected operating cash flow = refinancing risk.
- **Trailing 12 months** instead of "latest year", so quarterly data doesn't break the ratios.
- **Data confidence** as a separate output ("8/14 inputs, single-company accounts, FY2024"). Thin data is shown as thin, not coloured green.
- **Calibration** against historical Catalyst defaults (GetBack 2018 and others), and comparison with Polish bankruptcy-prediction models (Mączyńska, Hołda, Gajdka–Stos). The sample is small: this is calibration, not machine learning.
- **Versioned methodology:** each analysis stores its inputs and methodology version; scorecards are recomputed from stored facts when rules change.

#### Finance subcategories

*Added 2026-10-31.* `Finance` is one industry today, and all of it is out of scope. On 2026-10-31 prod had 32 Finance issuers of two kinds:

- **Non-bank lenders (~12)**, where a scorecard helps a bondholder: debt collectors (Kruk, Best, Kredyt Inkaso, Vindexus, Indos, Best FIZ Wierzytelności, Grupa Corpus Iuris), leasing and factoring (Vehis, Internetowy Fundusz Leasingowy, AOW Faktoring), lending (PragmaGO) and investment firms (MCI). Catalyst's largest default, GetBack (2018), was a debt collector.
- **Banks, mortgage banks, insurers, state and public institutions (~20)**: PKO BP, mBank, the mortgage banks, cooperative banks, PZU, the State Treasury, BGK, PFR, the EIB. Regulated or state-backed; they stay without a scorecard.

The operating-company scorecard misleads for lenders: borrowing is their business, so Net Debt/EBITDA is always high; revenue isn't a meaningful figure (income is interest on portfolios and revaluations); operating cash flow is negative while they grow, because portfolio purchases are operating outflows. Kruk's card showed Debt Burden red for these reasons.

Plan:

1. **Subcategories** on the issuer profile, below `Finance`: debt collector; leasing, factoring and lending; investment firm or fund; bank; insurer; state or public institution. Start with a reviewed mapping of the current issuers (no AI calls), then teach the classification prompt to pick a subcategory for new issuers. Only the first three are in fundamental scope.
2. **Finance scorecard v1, from figures the filings already give:** equity / assets, debt / equity, interest cover (operating profit / interest), return on equity, bonds as a share of debt (refinancing risk). The ESEF parser reads debt from balance sheets in order of liquidity (no current and non-current split), as financial companies file them.
3. **Debt collector cash measures:** cash collections from portfolios, cash EBITDA (collections minus costs), net debt / cash EBITDA, portfolio purchases vs collections. These are in filer-specific lines and notes: a per-issuer concept mapping or AI extraction with quotes (section 2).
4. **Maturities and liquidity:** bonds due in 12 months (from `BondDetails`) against cash and undrawn credit lines.
5. **Calibration** against GetBack 2018 and other Catalyst defaults of financial issuers, before the colours are trusted.

### 4. Fundamentals combined with market data

- **Risk vs yield chart:** fundamental risk band against spread, coloured by sector. Shows bonds paying more than similar-risk peers, and bonds priced as safe that score poorly.
- **Mismatch alerts:** spread jumps or price drops with no fundamental news.
- **Filter and sort** the bonds list by risk band, and show the band on the bond card.

### 5. Monitoring

- **Re-run on new reports** (EBI/ESPI, new KRS filings) instead of on click.
- **Alerts:** report filed late, auditor change, covenant breach, a dimension changing colour, unusual price drop or volume.
- **Watchlist from holdings** (PortfolioTracker), so alerts focus on bonds held. The email becomes a weekly digest of changes.

### 6. Storage

- Raw documents (XML, PDF, agent transcripts) in **S3**.
- DynamoDB keeps structured data only:
  - `Issuer`, keyed by KRS number, with its bonds linked;
  - `Financials`, keyed issuer#period#scope, with a source per number;
  - `Extraction` (maturity schedule, covenants, flags), with quotes;
  - `Analysis`: inputs, methodology version, scorecard, narrative.
- A sparse index for "latest" instead of scans. The size limit and the two-write problem go away once transcripts live in S3.

### 7. Presentation

- **Issuer page** (`/issuers/[krs]`) instead of a modal:
  - a summary sentence;
  - the scorecard, labelled with period, scope and sources;
  - a 5-year chart for each metric;
  - upcoming maturities against cash;
  - peer ranking within the sector;
  - the issuer's bonds with their yields;
  - red flags with quotes;
  - analysis history, with what changed since the last report.
- **Country of origin on the issuer card** (*added 2026-11-01*): issuers registered abroad (Allegro.eu in Luxembourg, the EIB, foreign SPVs) carry a different legal and insolvency regime, and their filings aren't in the KRS. Country from the KRS (Poland) or the LEI record's legal address (GLEIF), stored with the issuer's identity (phase 1b).
- **Cross-issuer views:** the risk-vs-yield chart, a sector heatmap, a market-wide maturity calendar.
- **Agent logs** move to an admin/debug view.

### 8. Quality control

- **Test set of known answers:** ~20 issuers with financials checked by hand against their annual reports, covering developers, financial companies, private and listed issuers.
- Run on every prompt, model or parser change; report accuracy per field. Without it, model upgrades are guesswork.
- Cost recorded per run, with a daily budget.

---

## Roadmap

| Phase | What | Why this order |
|---|---|---|
| 0 | Fix part-year scoring and the false-yellow trend rating; stop scoring financial and municipal issuers; start the test set | Wrong scorecards are live today |
| 1 | Test KRS access → issuer KRS numbers → filings ingested in code with sources → S3 + new tables | Everything else depends on numbers we can trust |
| 1b | Report corpus from official sources, AI extraction for PDFs verified in code, statement lines stored, issuer identity with country, import page with coverage view | One way in for every format; data shaped for phase 2 |
| 2 | Developer and Finance rules (Finance subcategories first), cash flow, maturities vs cash from our bond data, data confidence | Most valuable analysis, cheap once data is solid |
| 3 | Issuer page, risk-vs-yield chart, peer ranking | Where users see the value |
| 4 | Re-run on new reports, alerts, portfolio watchlist, calibration on defaults | Turns a report into monitoring |

### Phase 1 scope

Implemented 2026-10-30:

- **Filings downloaded by hand** from rdf-przegladarka.ms.gov.pl (XML), imported with `npm run import-filing` (docs/development.md, "Importing filed statements").
- **Parser** (`packages/core/src/bonds/fundamentals/filings/FilingParser.ts`): Ministry of Finance structures JednostkaInna and SkonsolidowanaJednostkaInna, in złoty or thousands, schema versions 1-2 and 2-0E (the line codes are the same), both income statement variants, both cash flow methods. Every figure keeps the statement lines it came from. Consistency checks: assets = equity and liabilities, assets = fixed + current, net profit in the income statement = in the balance sheet.
- **Financial debt** = loans, bonds, other financial liabilities (incl. leases) and bills of exchange owed to third parties, long- and short-term. Liabilities to related parties aren't itemised in the filing and are left out.
- **IFRS reporters** (added 2026-10-31): ESEF report packages (`EsefParser.ts`: IFRS taxonomy tags; debt lines from the filer's calculation tree, extension concepts classified by anchor or label) and untagged IFRS statements as XHTML (`IfrsTextParser.ts`: line labels, accepted only when the balance sheet ties). Balance sheets in order of liquidity (financial companies) are read too: debt lines under total liabilities, checked on Kruk's FY2023–2025 reports. Tried on the ESEF packages of 11 app issuers from filings.xbrl.org (Dom Development, Archicom, Develia, Atal, Dekpol, Marvipol, Unibep, Cavatina, Echo Investment, PCC Rokita, Cognor; FY2022–2023): all parse with the checks passing; Dom Development's figures match stockwatch.pl. The ESEF LEI is turned into the KRS number through GLEIF.
- **Storage:** original files in the `Filings` S3 bucket; one row per fiscal year and scope (single company / group) in the `IssuerFinancials` table, keyed by KRS number (`LEI:<lei>` for companies registered abroad), with the app's issuer name. Each filing also fills the previous year from its comparative column, until that year's own filing is imported.
- **Matching:** by company name (legal form ignored), or `--issuer`; the KRS number is checked against the KRS register API. The KRS number is kept on the financials rows, not on the issuer profile (classification rewrites the profile).
- **Scorecard:** the issuer list uses the filed figures when an issuer has any (group accounts first, full years only), else the AI-collected ones; the issuer card says which.

Not yet: small/micro entity structures (JednostkaMala, JednostkaMikro); PDF statements; a web upload; an issuer page keyed by KRS number; the test set of hand-checked answers (needs filings downloaded by a person).

### Phase 1b scope: report import for every format

*Added 2026-11-01.* Lessons from the first reports (Dom Development, KRUK, Cyfrowy Polsat, KGHM, P4):

- **Structured filings converge.** KRS XML has fixed line codes: no per-company changes. ESEF needed only general IFRS variants (balance sheet in order of liquidity, totals excluding held for sale, filer depreciation lines); each new report teaches less.
- **Untagged documents don't.** Every untagged report or PDF needed layout-specific patches (KGHM: month-name dates, "Note" references, wrapped labels, units). Those patches were dropped; the text parser isn't extended further.
- **Coverage:** private issuers file KRS XML, listed issuers ESEF. PDFs remain for unlisted IFRS reporters (P4), foreign issuers (Allegro.eu) and issuers with only a PDF on their website (KGHM's site).

Goal: an **import page in the app** that accepts any report (KRS XML, ESEF `.zip`/`.xbri`/`.xhtml`, untagged XHTML, PDF), shows what is imported per issuer, and stores data in a form the later phases (sector rules, finance scorecard, cash flow, maturities) can use without re-reading documents.

1. **Corpus from official sources.** Keep collecting each corporate issuer's latest annual reports from its website, its ESPI/EBI filings or (downloaded by hand) the KRS repository; record per issuer where the report was found and in which format. Every report is run through the parsers; general fixes go into the ESEF parser, layout-specific ones don't. Hand-checked figures from these reports become the known-answers test set (section 8).
2. **AI extraction for unstructured reports**, verified in code:
   - code finds the statement pages (headings, page text); only those pages go to the model (PDF document input of the Bedrock Converse API, or extracted text);
   - the model fills a fixed schema through a tool call: per line, the label as printed, the page, the value per column, the column dates, unit and currency;
   - code checks every figure: the number appears on the cited page, the balance sheet ties, subtotals equal their lines, comparative columns match the stored previous year; a figure that fails is rejected, not stored;
   - mapping lines to fields is code (the same rules as the parsers), so the model only reads;
   - result: format `ai-pdf` with the model and prompt version, shown as such on the card. Roughly one call per report on 5–10 pages.
3. **Store statement lines, not only scorecard fields.** Per filing: entity, period, scope, accounting standard (IFRS / Polish GAAP), currency, unit, source document, method (parser or AI with model), checks and review status; and every statement line with its label, value and standard identifier (IFRS concept, KRS position code, or none). Scorecard fields are derived from the lines, so new metrics (finance, developer, cash flow) don't need the documents again.
4. **Issuer identity:** one record per issuer: KRS number and/or LEI, registered name, country (see section 7), links to its bonds. Fills the issuer → entity mapping instead of name matching on every import.
5. **Import page:** upload (presigned S3 URL) → parse in a Lambda (AI route for PDFs, with a cost note) → review screen with the figures, checks and notes, side by side with the previous year → confirm to store. A coverage view lists issuers with their latest imported year, format and scope, and those with nothing or an old year, with a link to the issuer's report page or KRS search.
6. **Per-issuer overrides** for the odd line a parser can't place, reviewed once and stored with the issuer, instead of more general heuristics.

Progress:

- *2026-11-01:* **AI extraction for PDFs** built into the importer (`AiPdfExtractor.ts`, format `ai-pdf`): pdfjs-dist text, statement pages found in code, the model copies the lines through a fixed-schema tool, code checks every amount against its page and the balance sheet totals. Mapping lines to fields turned out to work better in the model (it classifies each line into a fixed list) than by label rules, with code summing and checking. First runs: KGHM (164-page PDF) and P4 (72 pages), all checks passing, ~$0.15 each with Sonnet 4.6; KGHM's figures equal those from its untagged XHTML. Imported to prod with Cyfrowy Polsat (ESEF). P4 shows loans and bonds as one "financial liabilities" line: the bond split needs the notes (section 2).
- *2026-11-01:* **Financials view**: a Financials tab in the issuer's report window (also for issuers with imported reports and no AI analysis) shows up to six fiscal years: filed figures where a report is imported, otherwise the AI analysis's; the source and a link to the original document per year; the statement lines behind each figure on hover; years where the AI analysis disagrees with the report by more than 2% are marked. API: `GET /api/issuers/{name}/financials`.
- *2026-11-01:* **Financials page** (`/financials`, in the menu): every issuer with what's collected (imported reports: latest year, number of years, formats, scope; AI analysis years; which one the scorecard uses), filtered by coverage and searched by name or industry; picking one shows its Financials view. The issuer list API returns a `financialsCoverage` summary per issuer, Finance and Municipal issuers included. Imported Żabka Group (ESEF, under its LEI, Luxembourg) and Benefit Systems (PDF; its site has no ESEF package). The PDF route now reads an empty cell as nothing in that column, like a dash.
- *2026-11-01:* **KRUK** imported (ESEF FY2024–2025, so 2023–2025): the first Finance issuer with data; it has no scorecard (Finance is out of scope until phase 2). Its revenue is the filer's operating income total (portfolio interest income, services, sales), since no revenue total is tagged. The FY2023 file came without its package (no calculation tree), so it wasn't imported.
- *2026-11-01:* **Listed-issuer batch** (FY2025, with FY2024 from the comparative column), from the companies' own sites: ESEF packages for Murapol, Atal, Inpro, Enea, Allegro.eu (LEI), PCC Rokita, PCC Exol, and Erbud (bare report, no package); PDFs read by AI for Dom Development, Marvipol, Echo Investment, Unibep and Cognor (single company, KRS passed by hand), about $0.15 each. 19 issuers now have imported reports. Not imported: Orlen and PGE (their sites reject automated downloads; not worked around), Dekpol (consolidated statements only as a .7z archive), Pepco and Polenergia (English PDFs only: the PDF route reads Polish number formats, `1,234` would be misread), Develia, Archicom, Ronson, Lokum, BBI Development, Cavatina, P.A. Nova, AB, MOL (report not found on their sites in this pass). Bankier.pl and money.pl mirror the filings but block AI crawlers in robots.txt, so they weren't used. General fixes from the batch: ESEF `InventoriesTotal`; filer debt lines by name in a report without its package; PDF headings with words in between or over two lines, "zysków lub strat", comprehensive income; tables of contents without dot leaders; column dates as DD.MM.YYYY.
- *2026-11-01 to 11-02:* **More issuers and languages.** Imported Orlen, Polenergia, Dekpol, P.A. Nova, AB, Pepco (English PDF, under its LEI), PGE (ESEF, from a file downloaded by hand) and MOL (Hungarian PDF, under its LEI; GLEIF confirmed the LEI). The PDF route reads English number formats (decided per report from the printed amounts) and Hungarian statement headings; a prompt rule keeps an "other financial liabilities" line out of debt when the statement shows borrowings on their own lines. 27 issuers have imported reports. Still to download by hand: Develia, Archicom, Ronson, Lokum, BBI Development, Cavatina.
- *2026-11-02:* **Known-answers test set** (`scripts/check-filings/`, section 8): 32 reports with figures read by hand from the printed statements, compared with the stored rows and a fresh parse (`--pdf` re-reads the PDFs, ~$1.50). **Issuer card registration line:** country, KRS or local register number and LEI, stored with each row as `registration`.
- *2026-11-02:* **Statement lines stored** (item 3; design: `2026-11-02-statement-lines-design.md`). Every year row keeps every line of its three statements with label, value, the filing's identifier (KRS code, XBRL concept), parent subtotal and a standard item from one vocabulary across formats; plus accounting standard, presented unit and review status (`hand-checked` for the test set). ESEF lines come from the package's presentation roles with labels from the printed table; KRS labels from the Ministry of Finance schemas. PDF prompt version 6 classifies lines into the larger item list and gives a field to every line of a kind (both of KGHM's intangible lines, all of Cognor's amortisation lines). Existing rows were filled from their stored originals by `reparse-filings`, figures unchanged (57 of 59 years; 30 test-set years marked hand-checked). KGHM and Cognor were re-imported with version 6 instead, which corrected two figures (KGHM intangibles 2,980 not 2,799, both intangible lines; Cognor depreciation 55,458 not 55,123, with intangible amortisation); all 59 years now have lines and all 32 test-set years are hand-checked. A *Full statements* view in the Financials view shows a year's lines. Kruk was re-imported to pick up its inventory (`InventoriesTotal`, supported after its import). Scorecard figures are still computed by the parsers; deriving them from the lines waits until phase 2 needs it.

- *2026-11-03:* **Issuer identity** (item 4; design `2026-11-03-issuer-identity-design.md`). Every issuer name gets its company from the LEI register (GLEIF): by its bonds' ISINs, else an exact name match. In prod 171 of 172 names resolved (170 automatically, PKN Orlen by hand; WB Electronics has no LEI), 3 left for review. Names of one company show as one card (Orlen and PKN Orlen, Best and Kredyt Inkaso, Gmina Redzikowo and Słupsk); a financing vehicle uses its group's reports (Pepco's bonds are issued by PEU (FIN) PLC); reports are joined by company; every card shows where the issuer is registered; imports find the issuer by KRS number or LEI.

### Phase 0 scope

- `StockwatchTool`: only complete years (four quarters) are emitted. The task prompt asks for complete fiscal years only.
- `computeScorecard`: Financial Trend is `n/a` when no trend metric is available, and green needs at least two available metrics.
- Scorecards are recomputed from the stored financials when the profiles API is read, so existing results pick up rule fixes without new paid runs. A part-year already stored (e.g. Dadelo) still needs a re-run.
- Financial and municipal issuers (industries `Finance`, `Municipal`) are out of scope: skipped by the workflow, no scorecard returned, no trigger button on the card.
- Test set: regression tests built from the stored analyses (Dadelo, Arche, Best). The hand-checked set of known answers (section 8) needs figures checked against annual reports by a person, and continues in phase 1.
