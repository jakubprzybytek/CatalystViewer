# Design: Fundamental Analysis for Corporate Bond Issuers

**Date:** 2026-05-11
**Status:** Draft

---

## Overview

This document defines a framework for assessing the default risk of corporate bond issuers listed on the Catalyst exchange (Warsaw Stock Exchange). It is targeted at retail and semi-professional bond investors, not equity analysts — the goal is not to determine fair value but to answer a single question: **how likely is this issuer to fail to repay its bonds?**

The framework is intentionally simple. All inputs come from data that companies are already required to report annually (P&L statement, balance sheet). No exotic models, no market pricing data, no DCF.

### Scope

- **In scope:** Corporate issuers — operating companies (manufacturing, retail, services, construction, technology, energy, etc.)
- **Out of scope:** Municipal bond issuers, cooperative banks (spółdzielcze kasy oszczędnościowo-kredytowe), financial institutions (banks, insurance, leasing companies). These require different analytical frameworks due to their distinct capital structures and regulatory regimes.

### Future Extensions

This is version 1 of the framework — generic corporate analysis only. Planned follow-on work:
- **Industry-specific modules** — override generic thresholds with calibrated ones per industry segment (e.g. real estate developers carry structurally higher leverage; manufacturing companies have asset-heavy balance sheets). The Catalyst market is dominated by real estate developers and construction companies, which are the highest-priority candidates for a dedicated module.
- **Threshold calibration** — validate and adjust thresholds against historical Catalyst default cases rather than relying solely on conventional credit analysis benchmarks.

---

## Design: Tiered Risk Scorecard

Each issuer is assessed across **6 independent risk dimensions**. Every dimension produces a traffic-light signal — Green (low risk), Yellow (watch), Red (elevated default risk) — based on 1–3 metrics computed directly from annual report data.

No single aggregate score is produced. The investor sees a 6-row card and draws their own conclusion. A company with 5 greens and 1 red is very different from one with 2 greens and 4 reds, and collapsing that into a single number would destroy the useful information.

The first 5 dimensions reflect the **current-year snapshot**. The 6th dimension reflects the **multi-year trajectory** — whether the company's financial health is improving or deteriorating.

---

## Dimensions and Metrics

### Terminology

- **Financial Debt** — interest-bearing debt only: bonds outstanding + bank loans + finance leases. Excludes trade payables, provisions, and other operating liabilities.
- **EBITDA** — Earnings Before Interest, Tax, Depreciation, and Amortisation = EBIT + D&A (all sourced from P&L).
- **Net Debt** — Financial Debt minus Cash and Cash Equivalents.

---

### Dimension 1 — Debt Burden

*How heavily leveraged is the company relative to its capital base?*

| Metric | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Debt-to-Equity (D/E) | Financial Debt / Equity | < 1.0× | 1.0 – 2.0× | > 2.0× |
| Net Debt / EBITDA | (Financial Debt − Cash) / EBITDA | < 2.5× | 2.5 – 4.0× | > 4.0× |

High D/E means the company is primarily funded by creditors, not owners — in distress, equity holders absorb losses first, but if leverage is extreme, bondholders are at risk too. Net Debt/EBITDA translates leverage into "years of operating cash flow needed to repay debt" — a practical solvency gauge.

---

### Dimension 2 — Debt Service Capacity

*Can the company cover its interest payments from operating profit?*

| Metric | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Interest Coverage Ratio (ICR) | EBIT / Interest Expense | > 3.0× | 1.5 – 3.0× | < 1.5× |

An ICR below 1.0× means the company is not generating enough operating profit to pay interest — it must borrow or draw on reserves. Below 1.5× there is very little buffer against any revenue decline or cost increase. This is the single most important metric for bond investors.

---

### Dimension 3 — Liquidity

*Can the company meet its obligations over the next 12 months without selling long-term assets?*

| Metric | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Current Ratio | Current Assets / Current Liabilities | > 1.5 | 1.0 – 1.5 | < 1.0 |
| Quick Ratio | (Current Assets − Inventory) / Current Liabilities | > 1.2 | 0.8 – 1.2 | < 0.8 |

A current ratio below 1.0 means short-term liabilities exceed short-term assets — a classic liquidity warning. The quick ratio strips out inventory because it may be illiquid or slow to convert to cash.

---

### Dimension 4 — Profitability

*Is the core business generating sustainable profit?*

| Metric | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Operating Margin (EBIT Margin) | EBIT / Revenue | > 10% | 5 – 10% | < 5% or negative |
| Net Profit Margin | Net Profit / Revenue | > 5% | 1 – 5% | < 1% or negative |

Profitability is not the same as solvency, but persistent thin or negative margins erode equity and eventually threaten the ability to service debt. An issuer with a 1% net margin has almost no buffer against a bad year.

---

### Dimension 5 — Asset Coverage

*If the company were wound up today, would bondholders recover their principal?*

| Metric | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Asset Coverage Ratio | (Total Assets − Intangibles − Current Liabilities) / Financial Debt | > 1.5× | 1.0 – 1.5× | < 1.0× |
| Equity Ratio | Equity / Total Assets | > 30% | 15 – 30% | < 15% |

An asset coverage ratio below 1.0× means tangible net assets do not fully cover outstanding debt — bondholders would face losses in liquidation. The equity ratio shows what fraction of assets is funded by owners rather than creditors; very low equity provides a thin cushion.

---

### Dimension 6 — Financial Trend (5-Year Trajectory)

*Is the company's financial health improving or deteriorating?*

This dimension requires at least 3 years of data; 5 years is preferred. It answers whether the snapshot from dimensions 1–5 represents a stable position or a temporary state in a longer-term story.

| Metric | What it measures | Green | Yellow | Red |
|---|---|---|---|---|
| Revenue CAGR (up to 5yr) | Top-line growth | > 5% p.a. | 0 – 5% p.a. | Negative (shrinking) |
| EBITDA Margin Trend | Operational efficiency over time | Consistently improving or stable > 10% | Flat or minor fluctuation | Consistently deteriorating |
| Net Debt / EBITDA Trend | Leverage trajectory | Declining over time | Flat | Rising over time |

A company can have a poor current-year snapshot but a strongly improving trend — that is a different risk than a company with reasonable current numbers but a three-year decline into them. Conversely, strong current metrics with a deteriorating trend are an early warning signal.

**Signal rules:**
- 🟢 Green — all 3 metrics point in the positive direction
- 🟡 Yellow — mixed signals (some improving, some flat or slightly declining)
- 🔴 Red — 2 or more metrics show consistent deterioration

---

### Threshold Provenance

The thresholds above are derived from mainstream credit analysis convention (CFA Institute credit analysis methodology, S&P corporate rating criteria, standard leveraged finance practice). They are **provisional starting points**, not empirically calibrated to the Catalyst market. Known limitations:

- They reflect norms for larger Western European/US companies; Polish SMEs may display structurally different ratios.
- Industry-specific modules (future work) will override these with sector-appropriate thresholds.
- Ideally thresholds should be back-tested against historical Catalyst defaults.

---

## Data Sources

All inputs come from the issuer's annual financial statements (sprawozdanie finansowe):

| Input | Statement | Polish label |
|---|---|---|
| Revenue | P&L | Przychody ze sprzedaży |
| EBIT | P&L | Wynik operacyjny (EBIT) |
| D&A | P&L / Notes | Amortyzacja i deprecjacja |
| Interest Expense | P&L | Koszty finansowe (odsetki) |
| Net Profit | P&L | Zysk netto |
| Total Assets | Balance Sheet | Suma aktywów |
| Intangible Assets | Balance Sheet | Wartości niematerialne i prawne |
| Equity | Balance Sheet | Kapitał własny |
| Financial Debt | Balance Sheet + Notes | Kredyty, pożyczki, obligacje |
| Cash | Balance Sheet | Środki pieniężne |
| Current Assets | Balance Sheet | Aktywa obrotowe |
| Inventory | Balance Sheet | Zapasy |
| Current Liabilities | Balance Sheet | Zobowiązania krótkoterminowe |

Annual reports for Catalyst issuers are available on the ESPI/EBI system and the issuer's investor relations page. For the 5-year trend, the prior four annual reports are required.

---

## Example Analyses

### Example A: Polmech Sp. z o.o. — Mechanical Parts Manufacturer *(Low Risk)*

**Selected financials (PLN thousands, most recent year + 4-year history)**

| Line | Y-4 | Y-3 | Y-2 | Y-1 | Current |
|---|---|---|---|---|---|
| Revenue | 31 400 | 35 200 | 39 800 | 43 500 | 48 200 |
| EBIT | 2 900 | 3 400 | 4 100 | 4 600 | 5 100 |
| EBITDA | 5 100 | 5 800 | 6 500 | 7 100 | 7 800 |
| Interest Expense | 1 100 | 1 100 | 1 150 | 1 200 | 1 200 |
| Net Profit | 1 400 | 1 800 | 2 300 | 2 700 | 2 900 |
| Total Assets | 34 000 | 36 000 | 38 500 | 40 000 | 42 000 |
| Intangibles | 900 | 900 | 850 | 800 | 800 |
| Equity | 12 000 | 13 500 | 15 500 | 17 000 | 18 500 |
| Financial Debt | 15 000 | 14 800 | 14 500 | 14 200 | 14 000 |
| Cash | 1 500 | 1 800 | 2 200 | 2 800 | 3 200 |
| Current Assets | 11 000 | 12 500 | 13 800 | 15 000 | 16 000 |
| Inventory | 4 200 | 4 300 | 4 400 | 4 400 | 4 500 |
| Current Liabilities | 8 500 | 8 800 | 9 200 | 9 500 | 9 800 |

**Current-year scorecard:**

| Dimension | Metric | Calculation | Value | Signal |
|---|---|---|---|---|
| Debt Burden | D/E | 14 000 / 18 500 | 0.76× | 🟢 Green |
| Debt Burden | Net Debt/EBITDA | (14 000 − 3 200) / 7 800 | 1.38× | 🟢 Green |
| Debt Service | ICR | 5 100 / 1 200 | 4.25× | 🟢 Green |
| Liquidity | Current Ratio | 16 000 / 9 800 | 1.63 | 🟢 Green |
| Liquidity | Quick Ratio | (16 000 − 4 500) / 9 800 | 1.17 | 🟡 Yellow |
| Profitability | EBIT Margin | 5 100 / 48 200 | 10.6% | 🟢 Green |
| Profitability | Net Margin | 2 900 / 48 200 | 6.0% | 🟢 Green |
| Asset Coverage | Asset Coverage Ratio | (42 000 − 800 − 9 800) / 14 000 | 2.24× | 🟢 Green |
| Asset Coverage | Equity Ratio | 18 500 / 42 000 | 44% | 🟢 Green |

**Trend dimension:**

| Metric | Trend | Signal |
|---|---|---|
| Revenue CAGR (4yr, 5 data points) | 11.3% p.a. | 🟢 Green |
| EBITDA Margin Trend | 16.2% → 16.2% → 16.3% → 16.3% → 16.2% (stable ~16%) | 🟢 Green |
| Net Debt/EBITDA Trend | 2.65× → 2.24× → 1.89× → 1.60× → 1.38× (declining) | 🟢 Green |

**Overall:** 11× Green, 1× Yellow. Low default risk. Revenue growth is strong and consistent, leverage is declining as the company pays down debt from operating cash flows. The only caution is inventory-heavy quick ratio — worth watching but not alarming for a manufacturer.

---

### Example B: Budmax S.A. — Construction Subcontractor *(High Risk)*

**Selected financials (PLN thousands, most recent year + 4-year history)**

| Line | Y-4 | Y-3 | Y-2 | Y-1 | Current |
|---|---|---|---|---|---|
| Revenue | 71 000 | 68 500 | 65 200 | 63 000 | 61 000 |
| EBIT | 4 200 | 3 800 | 3 100 | 2 400 | 1 800 |
| EBITDA | 6 000 | 5 600 | 5 000 | 4 200 | 3 400 |
| Interest Expense | 1 200 | 1 300 | 1 400 | 1 500 | 1 600 |
| Net Profit | 2 100 | 1 500 | 900 | 400 | 100 |
| Total Assets | 48 000 | 50 000 | 52 000 | 53 500 | 55 000 |
| Intangibles | 1 000 | 1 100 | 1 100 | 1 200 | 1 200 |
| Equity | 12 500 | 13 000 | 12 500 | 9 500 | 8 000 |
| Financial Debt | 18 000 | 21 000 | 24 000 | 26 500 | 28 000 |
| Cash | 2 000 | 1 800 | 1 500 | 1 200 | 900 |
| Current Assets | 22 000 | 22 500 | 22 000 | 22 000 | 22 000 |
| Inventory | 2 500 | 2 700 | 2 800 | 2 900 | 3 000 |
| Current Liabilities | 18 000 | 19 500 | 21 500 | 23 000 | 24 000 |

**Current-year scorecard:**

| Dimension | Metric | Calculation | Value | Signal |
|---|---|---|---|---|
| Debt Burden | D/E | 28 000 / 8 000 | 3.50× | 🔴 Red |
| Debt Burden | Net Debt/EBITDA | (28 000 − 900) / 3 400 | 7.97× | 🔴 Red |
| Debt Service | ICR | 1 800 / 1 600 | 1.13× | 🔴 Red |
| Liquidity | Current Ratio | 22 000 / 24 000 | 0.92 | 🔴 Red |
| Liquidity | Quick Ratio | (22 000 − 3 000) / 24 000 | 0.79 | 🟡 Yellow |
| Profitability | EBIT Margin | 1 800 / 61 000 | 2.95% | 🟡 Yellow |
| Profitability | Net Margin | 100 / 61 000 | 0.16% | 🔴 Red |
| Asset Coverage | Asset Coverage Ratio | (55 000 − 1 200 − 24 000) / 28 000 | 1.06× | 🟡 Yellow |
| Asset Coverage | Equity Ratio | 8 000 / 55 000 | 14.5% | 🔴 Red |

**Trend dimension:**

| Metric | Trend | Signal |
|---|---|---|
| Revenue CAGR (4yr, 5 data points) | −3.7% p.a. (shrinking) | 🔴 Red |
| EBITDA Margin Trend | 8.5% → 8.2% → 7.7% → 6.7% → 5.6% (consistent decline) | 🔴 Red |
| Net Debt/EBITDA Trend | 2.67× → 3.43× → 4.50× → 6.02× → 7.97× (rapidly worsening) | 🔴 Red |

**Overall:** 6× Red, 3× Yellow. High default risk. Every trend indicator is moving in the wrong direction simultaneously — revenue declining, margins compressing, leverage rising. The ICR of 1.13× means there is virtually no buffer: a 12% drop in EBIT (one bad contract) would eliminate interest coverage entirely. Current liabilities exceed current assets, meaning the company is reliant on continuous creditor rollover. Asset coverage is only marginally above 1× and deteriorating.

---

## Interpreting the Scorecard

The scorecard is a structured starting point, not a definitive verdict. Investors should treat Red signals as prompts to investigate, not automatic disqualifications. A few principles:

- **Dimension 2 (Debt Service / ICR) is the most important single metric.** A company can survive temporary liquidity pressure or high leverage if it is generating enough operating profit to service debt. An ICR below 1.5× is a serious warning regardless of other signals.
- **Trend overrides snapshot for deteriorating companies.** A current-year snapshot that looks borderline Yellow can hide a multi-year slide toward Red. Always check dimension 6.
- **Context matters.** A seasonal business may always show a weak current ratio at year-end. A company that just made a large acquisition may temporarily show elevated leverage. Read the notes to the financial statements.
- **Missing or restated data is itself a signal.** Late filings, auditor qualifications, or restatements are red flags outside the metric framework.
