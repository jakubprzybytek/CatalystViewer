# Sector rules: developers, contractors, consumer and services

Roadmap phase 2 ("Rules per sector", section 3). Status: approved and built 2026-11-03.

## Why

The scorecard uses one set of rules for every operating company. On the 27 issuers with imported reports
(prod, 2026-11-03), many of its reds come from the business model, not from weakness:

- **Developers** (45 of about 90 corporate issuers, 6 with reports): flats and land are inventory, so the
  quick ratio is red for all six (Atal 0.16×, Dom Development 0.20×). Revenue is booked on handover, so
  net debt / EBITDA swings from year to year (Echo 13.3×). Interest is capitalised into inventory, so
  the interest cover from the income statement flatters.
- **Contractors** (Erbud, Unibep, Dekpol, P.A. Nova): margins of 2–5% are normal, so Unibep's 4.8% EBIT
  margin is red. Their cash is largely customers' advances, which the current rules count as theirs.
- **Consumer and services** (Pepco, Żabka, AB, Allegro, Benefit Systems, P4, Cyfrowy Polsat): suppliers
  finance the stock and customers pay upfront, so current liabilities exceed current assets by design.
  Current ratio, quick ratio and asset coverage are red for most (P4 has five reds, Żabka four).
  Shop, mast and gym leases are debt under IFRS 16, and the rules have no lease view.

Two problems apply to every sector:

- **The quick ratio** is red for 12 of the 27, including KGHM, whose inventory is copper.
- **Write-downs:** Cyfrowy Polsat's 2,717 m PLN goodwill write-down in 2025 turns EBIT negative. That
  makes three of its dimensions red: net debt is 40× EBITDA and interest cover is negative. A non-cash
  one-off shouldn't decide debt service.

## Rules

The rule set is chosen by the issuer's industry (from classification):

| Rule set | Industries |
|---|---|
| Developer | Developer |
| Contractor | Construction |
| Consumer and services | Retail, Telecommunications, Media, Other |
| General | Energy, Manufacturing, unclassified, any other |

Finance and Municipal stay out of scope. The card names the rule set ("rules: developer").

The six dimensions keep their names, so cards and history stay comparable. Each rule set changes the
metrics and thresholds inside them. Refinancing (bonds due vs cash) is the same for all.

Changes for every rule set:

- **Liquidity: the quick ratio goes.** General keeps the current ratio (green > 1.5, yellow ≥ 1.0).
  The refinancing dimension covers the cash side.
- **EBITDA before write-downs:** the income statement's impairment lines (goodwill, non-financial
  assets) are added back to EBIT for EBITDA and interest cover. The card notes it ("before a 2,717 m
  write-down").

### Developer

| Dimension | Metric | Green | Yellow | Instead of |
|---|---|---|---|---|
| Debt Burden | Net debt / (inventory + investment property) | < 0.3 | ≤ 0.6 | Net debt / EBITDA |
| | Net debt / equity | < 0.5 | ≤ 1.0 | D/E |
| Debt Service | EBIT / interest paid (cash flow), else / interest expense | > 3 | ≥ 1.5 | ICR on expense only |
| Liquidity | Current ratio | > 2.0 | ≥ 1.3 | current + quick ratio |
| | Buyer advances / inventory (pre-sales) | shown, not scored | | |
| Profitability | EBIT margin | > 15% | ≥ 8% | > 10% / ≥ 5% |
| | Net margin | > 10% | ≥ 5% | > 5% / ≥ 1% |
| Asset Coverage | Equity ratio | > 35% | ≥ 25% | > 30% / ≥ 15% |
| | Asset coverage ratio | as now | | |

### Contractor

| Dimension | Metric | Green | Yellow | Instead of |
|---|---|---|---|---|
| Liquidity | Current ratio | > 1.2 | ≥ 1.0 | current + quick ratio |
| | Cash net of advances (cash − contract liabilities) / revenue | > 5% | ≥ 0 | |
| Profitability | EBIT margin | > 4% | ≥ 2% | > 10% / ≥ 5% |
| | Net margin | > 2.5% | ≥ 0.5% | > 5% / ≥ 1% |

Debt Burden, Debt Service and Asset Coverage as General.

### Consumer and services

| Dimension | Metric | Green | Yellow | Instead of |
|---|---|---|---|---|
| Debt Burden | Net debt incl. leases / EBITDA | < 3.0 | ≤ 4.5 | < 2.5 / ≤ 4.0 |
| | Net debt excl. leases / EBITDA | shown, not scored | | D/E |
| | Free cash flow (operating cash flow − capex) / net debt | > 15% | ≥ 5% | |
| Liquidity | Operating cash flow / current liabilities | > 0.5 | ≥ 0.3 | current + quick ratio |
| Asset Coverage | Equity ratio | > 20% | ≥ 10% | > 30% / ≥ 15% |
| | Asset coverage ratio | shown, not scored | | |

Debt Service, Profitability and Trend as General.

The thresholds are starting values from common practice for each sector. They're checked on the issuers
below, and calibrated later against Catalyst defaults (phase 2, "Calibration").

## Data

Most inputs are scorecard figures already: inventory, equity, debt, cash, current assets and
liabilities, EBIT, revenue, operating cash flow, capex. Four come from statement lines:

| Input | Line item | In the 17 reports of these sectors |
|---|---|---|
| Leases | `debtLeases` | 16 (not Erbud) |
| Buyer advances, contract liabilities | `contractLiabilities` | 12 (not Atal, Murapol, Inpro, Allegro, Pepco) |
| Interest paid | `interestPaid` | 16 (not Murapol) |
| Write-downs | new item `impairment` | itemised in some (Cyfrowy Polsat, Pepco) |

So the scorecard gets these line items without reading the lines (they're left out of the list reads):

- **Item totals stored:** each row gets an `items` map, the sum per line item in units of the
  currency with the sign normalised (paid amounts positive). It's computed whenever lines are stored
  (import, `reparse-filings`).
- **`impairment` added** to the line item vocabulary, found by code in every format (`markWriteDowns`:
  the label or concept of an income-statement line names a write-down, and not of receivables, loans or
  other financial assets, nor a reversal or a subtotal). As built, the PDF prompt is unchanged (still
  version 6): the same rule finds write-downs in PDF lines, so all formats are judged alike and no AI call
  changes. A write-down is added back only when the depreciation figure doesn't already include it
  (PGE, Allegro, Pepco and MOL report "depreciation, amortisation and impairment" as one line; Cyfrowy
  Polsat's takes the goodwill write-down out again).
- **Backfill:** a script fills `items` for the 59 stored years from their lines. Rows whose items change
  only gain the new attribute; figures stay as they are. Impairment lines in PDF reports are found by
  label in the backfill; new PDF imports get them from the prompt. Before writing, the script prints
  each year's totals and compares them with the scorecard figures where both exist (leases in debt,
  interest), and the hand-checked test set must still pass.

Issuers scored from the AI analysis (no imported report) have none of the line items. Their sector
metrics without inputs show n/a. The rest still score: for developers, net debt / inventory (no
investment property in the AI figures), current ratio, margins and equity ratio.

## Expected effect (prod figures)

- **Developers:** the quick ratio reds go (all six). Atal's net debt / inventory is 0.33 (yellow), its
  current ratio 2.8 (green). Echo is judged on net debt / (inventory + investment property), about 0.8
  (red), instead of a lumpy 13× EBITDA; its equity ratio of 25% is yellow, Murapol's 26% too.
- **Contractors:** Unibep's margin turns yellow or green. Erbud shows cash below its advances
  (272 vs 309 m).
- **Consumer and services:** the working-capital reds go. P4 and Pepco remain red on equity ratio
  (6.4% and 5.4%), which is how leveraged they are.
- **Cyfrowy Polsat:** debt service and burden are measured before the write-down. Its net margin stays
  red, since the loss was real.

The implementation prints before/after signals for the 27 issuers for review, then deploys. Nothing is
stored but the `items` backfill.

## Steps

1. `impairment` item, `items` totals on rows, the backfill script (dry run, then dev, then prod).
2. Rule sets in `scorecard.ts`: `computeScorecard(years, ruleSet)`, with the ruleset chosen from the
   industry. Tests per rule set on the figures above.
3. API: rule set and new inputs passed in. Web: rule set label on the card, "shown, not scored"
   metrics in grey.
4. Before/after table for the 27 issuers; docs.

## Not now

- Developers' escrow accounts and pre-sales numbers from the notes (the "of which in escrow" lines are
  printed only by some, e.g. Atal).
- Contractors' order backlog (notes).
- Finance rules: only Kruk has a report.
- Data confidence per scorecard.

## As built: before and after (prod, 2026-11-03)

Dimensions in order: Debt Burden, Debt Service, Liquidity, Profitability, Asset Coverage, Trend, then
Refinancing (G green, y yellow, R red, . n/a).

| Issuer | Rules | Before | After |
|---|---|---|---|
| Atal | developer | RGRGG.G | yGGGG.G |
| Dom Development | developer | GGRGG.G | GGyGy.G |
| Echo Investment | developer | RRRRy.G | RRyRy.G |
| Inpro | developer | GGRGG.G | GGGGG.G |
| Marvipol | developer | yGGGG.G | yyGGG.G |
| Murapol | developer | yGRGy.G | yGGGy.G |
| Dekpol | contractor | GGyyG.G | GGGGG.G |
| Erbud | contractor | GRyRy.G | GRRRy.G |
| P.A. Nova | contractor | RyRGGRG | RyRGGRG |
| Unibep | contractor | yyyRy.G | yyyyy.G |
| AB | general (override) | GGRRGyG | GGGRGyG |
| Allegro.eu | consumer | GGyGR.G | GGGGG.G |
| Benefit Systems | consumer | yGRGR.G | GGGGG.G |
| Cyfrowy Polsat | consumer | RRyRy.G | yRGRG.G |
| P4 | consumer | RyRGR.G | yyGGR.G |
| Pepco | consumer | RyRRR.G | GyyRR.G |
| Żabka | consumer | RyRyR.G | Gyyyy.G |
| KGHM | general | G.RGG.G | G.yGG.G |
| PCC Exol | general | yGRyG.G | yGyyG.G |

Unchanged: Orlen, PKN Orlen, MOL, Polenergia, Enea, PGE, Cognor, PCC Rokita. Erbud's new red is its cash
below its advances (−1.1% of revenue). AB (an IT distributor, classified Retail) was red on operating cash
flow / current liabilities (0.04×) under the consumer rules: a distributor's working capital is positive,
so it's judged by the general rules instead (`RULE_SET_OVERRIDES` in `scorecard.ts`).
