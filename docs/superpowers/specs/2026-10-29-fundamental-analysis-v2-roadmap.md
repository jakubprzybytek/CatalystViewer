# Fundamental Analysis v2: Audit and Roadmap

**Date:** 2026-10-29
**Status:** Proposal. Phase 0 implemented (2026-10-29).
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
  - *Finance* (debt collectors, leasing, factoring): equity / assets, cash-based EBITDA, collections coverage, funding mix.
  - *Holding companies:* single-company vs group; the holding's bondholders rank behind the subsidiaries' creditors, so that is flagged.
  - *Municipal, state, banks:* excluded or handled separately.
- **Cash flow:** operating cash flow, free cash flow, operating cash flow / debt, capital expenditure.
- **Upcoming bond maturities vs cash.** `BondDetails` already holds each issuer's bonds, amounts and maturity dates. Bonds due in 12/24 months vs cash + expected operating cash flow = refinancing risk.
- **Trailing 12 months** instead of "latest year", so quarterly data doesn't break the ratios.
- **Data confidence** as a separate output ("8/14 inputs, single-company accounts, FY2024"). Thin data is shown as thin, not coloured green.
- **Calibration** against historical Catalyst defaults (GetBack 2018 and others), and comparison with Polish bankruptcy-prediction models (Mączyńska, Hołda, Gajdka–Stos). The sample is small: this is calibration, not machine learning.
- **Versioned methodology:** each analysis stores its inputs and methodology version; scorecards are recomputed from stored facts when rules change.

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
| 2 | Developer and Finance rules, cash flow, maturities vs cash from our bond data, data confidence | Most valuable analysis, cheap once data is solid |
| 3 | Issuer page, risk-vs-yield chart, peer ranking | Where users see the value |
| 4 | Re-run on new reports, alerts, portfolio watchlist, calibration on defaults | Turns a report into monitoring |

### Phase 0 scope

- `StockwatchTool`: only complete years (four quarters) are emitted. The task prompt asks for complete fiscal years only.
- `computeScorecard`: Financial Trend is `n/a` when no trend metric is available, and green needs at least two available metrics.
- Scorecards are recomputed from the stored financials when the profiles API is read, so existing results pick up rule fixes without new paid runs. A part-year already stored (e.g. Dadelo) still needs a re-run.
- Financial and municipal issuers (industries `Finance`, `Municipal`) are out of scope: skipped by the workflow, no scorecard returned, no trigger button on the card.
- Test set: regression tests built from the stored analyses (Dadelo, Arche, Best). The hand-checked set of known answers (section 8) needs figures checked against annual reports by a person, and continues in phase 1.
