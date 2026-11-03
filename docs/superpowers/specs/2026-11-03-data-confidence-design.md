# Data confidence: design

Roadmap phase 2 ("Data confidence", section 3). Status: proposed 2026-11-03.

## Why

A card's colours look the same whether they rest on a hand-checked annual report or on one figure an AI
agent found on the web. The roadmap asks for thin data to show as thin, not as green.

## What the data gives (prod, 2026-11-03, read only)

Of the 172 issuer names, 98 are out of scope (Finance, Municipal) and 31 in scope have no scorecard yet.
The 43 scorecards:

| Source | Issuers | Latest year | Metrics computed (5 snapshot dimensions) |
|---|---|---|---|
| Imported report | 27 | FY2025 (Pepco, AB: years to Sept 2025) | all for 25; 5 of 8 for KGHM and Polenergia |
| AI-collected | 16 | FY2024 for 10, FY2025 for 6 | all for 6 (Develia, Archicom, Adatex, art.Locum, BBI, Cavatina); 0–3 of 8 for 9 |

The thin AI cards still show colours. Domesta has one figure (FY2024 revenue and net profit), so one
dimension is coloured and four are n/a. Capital Park has nothing computable at all, so all its dots are grey.
Anwim, Cordia and Budlex have dimensions coloured by one metric out of two or three.

Two more gaps:

- **Trend needs 3 years.** 23 of the 27 reports cover 2 years (the report and its comparative column), so
  their Financial Trend is n/a. Importing the previous year's report fills it.
- **KGHM and Polenergia have no EBIT:** neither income statement prints an operating profit line, so net
  debt / EBITDA, interest cover and EBIT margin are n/a. That can be fixed separately by deriving EBIT
  (profit before tax + finance costs − finance income), and is listed under "Not now".

## What it computes

A pure function from the scorecard and its source gives, per issuer:

- **Source:** imported report (format, scope) or AI-collected (analysis date).
- **Latest year** and how far it's **behind**: a fiscal year is expected once 9 months have passed since it
  ended (annual reports are approved within 6 months, then filed). On 2026-11-03 FY2025 is expected, so the
  10 AI cards on FY2024 are a year behind.
- **Metrics computed** of those scored in the five snapshot dimensions (Debt Burden to Asset Coverage), and
  the names of the missing ones. Trend and Refinancing are left out of the count: Trend depends on how many
  years there are (shown as "2 years: no trend"), and Refinancing on bonds, not report figures.
- **Thin dimensions:** a dimension coloured by one metric where it has two or more. Its tooltip says
  "from 1 of 2 metrics".
- **Level:**
  - **High:** an imported report, at least 80% of metrics computed, not behind.
  - **Low:** under 50% of metrics, or two or more snapshot dimensions n/a, or two or more years behind.
  - **Medium:** the rest. That's AI-collected figures, however complete, since they aren't checked in code
    against a document; a report with gaps; data one year behind.

On today's data: 25 high (the reports), 9 medium (7 AI cards with full figures, KGHM and Polenergia), 9 low
(the thin AI cards: Anwim, Arche, Budlex, Capital Park, Cordia, Dantex, Domesta, Mosty Magazyny Energii,
Polska Grupa Farmaceutyczna).

## Where it shows

- **Issuer card caption:** "Fundamental Analysis · developer rules · High confidence". A tooltip gives the
  facts, e.g. "Imported report (ESEF), group accounts, FY2025 · 8 of 8 metrics · 2 years: no trend", or "AI-collected
  2026-05-28, FY2024 (a year behind) · 2 of 8 metrics; missing: ICR, EBIT margin, …".
- **Low confidence:** the dots are drawn faded, so a thin card doesn't read like a full one. The colours stay
  readable.
- **Thin dimension:** the "from 1 of 2 metrics" line in that dimension's tooltip.

## How it's built

- Core: `bonds/fundamentals/confidence.ts`, `dataConfidence(scorecard, source, years, today)` returns
  `{ level, source, periodEnd, yearsBehind, metrics: { computed, scored }, missing, years, thinDimensions }`.
  Tests on the issuers above (Atal high, KGHM medium, Domesta low, BBI medium for being behind).
- API: `getIssuerProfiles` adds `confidence` next to `scorecard`, computed at read time like the rest. Nothing
  is stored, and there are no AI calls or new resources.
- Web: the caption, tooltip and faded dots in `IssuerScorecard`; the `IssuerProfile.confidence` type in the SDK.

## Not now

- **Derived EBIT** for income statements without an operating profit line (KGHM, Polenergia).
- **A third year for the 23 two-year reports**, by importing each previous report. That's a data task, the
  same importer.
- **Re-running the 10 FY2024 AI analyses**, which are paid AI calls. Better: import their reports (Develia,
  Archicom, BBI, Cavatina are on the download list).
- **Filtering or sorting by confidence** in the issuer list and the Financials page.
- **Confidence on the bond card**, with the phase 3 risk band.
