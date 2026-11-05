# Finance rules: debt collectors, leasing and factoring, investment firms

Roadmap phase 2 ("Rules per sector", follow-up). Status: design, for approval (2026-11-05).

## Why

Finance issuers are out of scope today (`OUT_OF_SCOPE_INDUSTRIES` in `scope.ts`): no scorecard at all,
although they're a large part of the corporate bonds on Catalyst, and 10 of them now have imported reports.
The general rules don't fit them:

- **Debt is the business.** A lender borrows to buy debt portfolios, write leases or buy invoices. Net
  debt / EBITDA and the current ratio measure an industrial company's capacity to repay; a lender is judged
  by its leverage against equity, the margin between what it earns and what it pays, and its return on equity.
- **Operating cash flow is negative when it grows.** Buying portfolios or financing cars is an operating
  outflow (Vehis −1,380 m PLN, Best −164 m in 2025), so cash-flow metrics read growth as distress.
- **Two data gaps** hide most of the debt of two issuers (see "Parser fixes").

Banks, insurers and state bodies stay out of scope: they're regulated (capital ratios, solvency), their
bonds aren't the credit risk this app scores, or both.

## Sub-types

The rule set is chosen by a hand-reviewed map from issuer name to sub-type (in `scorecard.ts`, next to
`RULE_SET_OVERRIDES`). Industry "Finance" alone doesn't tell a debt collector from a bank, and the list
is short enough to keep by hand. A Finance issuer not in the map stays out of scope.

| Sub-type (rule set) | Issuers | With a report |
|---|---|---|
| Debt collector (`collector`) | Kruk, Best, Vindexus, Grupa Corpus Iuris, Indos, Kredyt Inkaso, Best FIZ | Kruk, Best, Vindexus, Corpus Iuris, Indos |
| Leasing and factoring (`leasing`) | Vehis, Internetowy Fundusz Leasingowy, AOW Faktoring, PragmaGO | all four |
| Investment firm (`investment`) | MCI Management | MCI |
| Out of scope | banks (Alior, BGK, Millennium, BOŚ, Pekao, Pocztowy, BS Rzemiosła, Erste, KBS, the mortgage banks, mBank, PKO BP), PZU, EIB, PFR, Skarb Państwa | |

The card names the rule set ("rules: debt collector").

## Rules

The six dimensions keep their names, as in the sector rules. Refinancing (bonds due vs cash) is the same
for all. The thresholds are starting values; they're checked on the issuers below and calibrated later
with the other rule sets.

### Debt collector and leasing/factoring

| Dimension | Metric | Collector green / yellow | Leasing green / yellow | Instead of |
|---|---|---|---|---|
| Debt Burden | Net debt / equity | < 1.5 / ≤ 2.5 | < 4.0 / ≤ 6.0 | Net debt / EBITDA, D/E |
| | Bonds / financial debt | shown, not scored | shown, not scored | |
| Debt Service | Interest cover: EBIT / interest expense (profit before tax + interest when there's no EBIT) | > 2.5 / ≥ 1.5 | > 1.5 / ≥ 1.2 | > 3 / ≥ 1.5 |
| Liquidity | Cash / financial debt due within 12 months | > 0.5 / ≥ 0.2 | > 0.3 / ≥ 0.1 | current + quick ratio |
| | Operating cash flow | shown, not scored | shown, not scored | |
| Profitability | Return on equity (net profit / average equity) | > 12% / ≥ 6% | > 12% / ≥ 6% | EBIT and net margin |
| | Return on assets (net profit / total assets) | > 5% / ≥ 2% | > 1.5% / ≥ 0.75% | |
| Asset Coverage | Equity ratio | > 35% / ≥ 25% | > 15% / ≥ 10% | > 30% / ≥ 15% |

Trend as General.

Notes on the choices:

- **Net debt / equity** is the covenant most Catalyst lenders' bond terms set (to be checked against the
  terms of each issuer's bonds before calibration).
- **Leasing and factoring** run on thinner equity than collectors: their assets are receivables that are
  repaid on a schedule, a collector's are portfolios bought at a discount whose recoveries are estimates.
- **Debt due within 12 months** is the sum of the debt lines under current liabilities (found by the
  lines' `parent`). It's n/a when the statement doesn't split debt by maturity.
- **Bonds / financial debt** shows how much the issuer depends on the bond market to refinance.

### Investment firm

| Dimension | Metric | Green / yellow | Instead of |
|---|---|---|---|
| Debt Burden | Net debt / total assets (loan to value) | < 25% / ≤ 40% | Net debt / EBITDA, D/E |
| Debt Service | Interest cover | shown, not scored | |
| Liquidity | Cash / financial debt due within 12 months | > 0.5 / ≥ 0.2 | current + quick ratio |
| Profitability | Return on equity | shown, not scored | margins |
| Asset Coverage | Equity ratio | > 50% / ≥ 35% | > 30% / ≥ 15% |

An investment firm's profit is mostly revaluation of its holdings and its interest is paid from exits and
dividends, which the statements don't show as income. So only the balance sheet is scored.

## Parser fixes

Both fixes change only how lines are mapped to line items; the figures come from the same lines.

1. **Vindexus: bonds in "other financial liabilities".** Its FY2025 statement (ESEF) has no bonds line:
   the bonds are in "Pozostałe zobowiązania finansowe" (72.4 m long-term, 28.2 m short-term), so its debt
   reads 2.2 m (FY2024, from its own report: 114.6 m, of which bonds 112.2 m).
   - New line item `otherFinancialLiabilities` for lines labelled "other financial liabilities" /
     "pozostałe zobowiązania finansowe" (ESEF `OtherFinancialLiabilities` and its extensions).
   - The scorecard counts them as debt when the year has no bonds line and the issuer had Catalyst bonds
     outstanding at the period end (from bond details), and notes it ("bonds taken from other financial
     liabilities, 100.6 m"). Otherwise they stay out of debt, as now.
   - The PDF prompt is unchanged (no AI call changes).
2. **Vehis: securitisation not counted as debt.** Its KRS XML statement has "zobowiązania z tytułu
   sekurytyzacji", 1,850.2 m long-term and 545.0 m short-term, mapped to no item. Its debt reads 436.9 m
   of 3,200.7 m assets.
   - New line item `debtSecuritisation` (labels with "sekurytyzac" / "securiti"), counted in financial
     debt for every rule set. Vehis's debt becomes 2,832.1 m.
   - A check over all stored lines lists any other issuer whose debt changes, for review before backfill.

Both need the `items` totals of the stored rows recomputed (`reparse-filings`), which writes to prod
rows: dry run first, then dev, then prod.

## Expected effect (prod figures, latest year)

Dimensions: Debt Burden, Debt Service, Profitability, Asset Coverage (G green, y yellow, R red). Liquidity
and Trend are printed in the build's before/after table.

| Issuer | Rules | Net debt / equity | Interest cover | ROE | ROA | Equity ratio | Bonds / debt | Signals |
|---|---|---|---|---|---|---|---|---|
| Kruk 2025 | collector | 1.32 | 3.56 | 22.0% | 8.3% | 40.9% | 47.9% | G G G G |
| Best 2025 | collector | 1.25 | 1.69 | 9.6% | 3.4% | 40.3% | mixed | G y y G |
| Vindexus 2025 (fixed) | collector | 0.26 | 2.57 | 9.2% | 5.9% | 67.6% | ~98% | G G y G |
| Corpus Iuris 2025 | collector | 0.73 | 6.53 | 33.0% | 14.8% | 45.6% | 94.2% | G G G G |
| Indos 2025 | collector | 0.94 | 2.09 | 12.1% | 4.0% | 34.7% | 97.3% | G y y y |
| PragmaGO 2024 | leasing | ≤ 2.76 | 1.41 | 8.6% | 2.0% | 25.6% | 79.9% | G y y G |
| AOW Faktoring 2025 | leasing | 2.95 | 1.22 | 2.8% | 0.6% | 21.5% | 67.7% | G y R G |
| Vehis 2025 (fixed) | leasing | 28.6 | 1.12 | 15.2% | 0.3% | 3.0% | 10.0% | R R R R |
| IFL 2025 | leasing | ≤ 1.64 | 3.93 | 44.1% | 8.4% | 23.6% | 99.8% | G G G G |
| MCI Management 2025 | investment | ≤ 24.6% LTV | 1.44 (shown) | 0.0% (shown) | | 52.1% | 37.4% | G . . G |

"≤": no cash figure, so net debt is gross debt. When the two profitability metrics disagree, the
dimension takes the worse one, as elsewhere.

Things the table shows that need a look before release:

- **Vehis** is red on three of four: 95 m of equity under 2.8 bn of debt. That's the leverage of a
  securitised lessor, and bondholders rank behind the securitisation. The signal is right; the card
  notes that the debt is mostly securitisation.
- **Corpus Iuris** earned 29.8 m net on 22.4 m revenue: a one-off or a revaluation inflates ROE. Check
  the report's notes before calibration.
- **Indos**'s 2024 was restated to a loss; Trend will show it.
- **Best**'s debt is one mixed line, so bonds / debt is n/a.

## Steps

1. Parser fixes: `otherFinancialLiabilities` and `debtSecuritisation` items, tests on the Vindexus and
   Vehis lines; the check over stored lines; `reparse-filings` dry run, dev, then prod (asks first: it
   writes to prod rows).
2. Rule sets `collector`, `leasing`, `investment` in `scorecard.ts`, the sub-type map, Finance issuers in
   the map brought into scope (`scope.ts`). Tests per rule set on the figures above.
3. API and web: the rule set label; "shown, not scored" metrics in grey (as built for the sector rules).
4. Before/after table for the 10 lenders; methodology doc (`fundamental-analysis-methodology.md`) updated.

## Not now

- **Collectors' cash recoveries and ERC** (estimated remaining collections): the best measure of a
  collector's capacity to repay, printed only in notes and management reports.
- **Cost of risk and non-performing share** for leasing and factoring: in notes only.
- **Covenant values** from each issuer's bond terms (would replace the starting thresholds).
- **Kredyt Inkaso and Best FIZ** reports: not collected yet.
- **PragmaGO FY2025** (PDF collected, not imported).
- **Banks and insurers**: capital ratios come from regulatory disclosures, not the statements.
