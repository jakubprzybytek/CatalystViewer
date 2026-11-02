# Statement lines: design

Roadmap phase 1b, item 3. Status: approved and built 2026-11-02 (steps 1–3); step 4 waits for phase 2.

## Why

Each IssuerFinancials row (one fiscal year of one company, group or single) keeps about 14 scorecard
figures, each with the source lines it came from. All other lines are thrown away after the import.
Phase 2 needs lines we don't keep:

- developers: customer advances (contract liabilities), loans granted, investment property (the split of
  inventory into land, work in progress and finished units is in the notes, which this change doesn't read);
- finance companies: loans or receivables portfolio, deposits, impairment charges;
- cash flow: interest paid, dividends paid, new borrowings and repayments.

Getting them today means reading every file again, and for PDFs paying the model again. With every
line stored, a new metric is a code change over stored data.

## What is stored

A new `lines` list on each year row, plus a few fields about the statement:

```ts
type StatementLine = {
    statement: 'balance' | 'income' | 'cashFlow';
    order: number;        // position in its statement, from 0
    label: string;        // as printed, in the filing's language
    value: number;        // units of the row's currency
    code?: string;        // the filing's own identifier, when it has one:
                          //   KRS XML: "Pasywa_B_III_3_A"; ESEF: "ifrs-full:Inventories", "dom:Bonds"
    anchor?: string;      // ESEF extension concept: the wider IFRS concept it is anchored to
    parent?: number;      // `order` of the subtotal this line adds up into, when known
    item?: LineItem;      // the app's standard item for this line (below), when it is one
    page?: number;        // PDF page
};

// New fields on DbIssuerFinancialsRecord
standard: 'ifrs' | 'pl-uor';     // IFRS, or the Polish accounting act (KRS XML)
presentedUnit: 1 | 1000 | 1000000;  // how the filing printed amounts (values are always in units)
lines: StatementLine[];
review: { status: 'parsed' | 'hand-checked' | 'flagged'; note?: string; at?: string };
```

The row already has the entity, period, scope, currency, source file, format (method) and checks, so
together this is the full record the roadmap lists.

**Sign.** Recorded per row as `lineSigns`. `printed` (IFRS text, PDF): as the statement shows it, a cost
in brackets is negative. `tagged` (KRS XML, ESEF): as the filing's data has it, the KRS amount or the XBRL
fact value with `sign` applied; a cost is positive. The printed sign of a tagged report isn't in its data
reliably (brackets sit outside the tag), so it isn't guessed.

**Where the lines come from, per format:**

| Format | Lines | Label | `code` | `parent` |
|---|---|---|---|---|
| KRS XML | every line code with a value | `krsLineLabels.ts`, generated from the Ministry of Finance schemas (`JednostkaInnaStrukturyDanychSprFin_v1-0.xsd` and the consolidated one) | the line code | the element the line sits in |
| ESEF | facts of the three primary statements (the package's presentation roles give which concepts and in what order), no dimensions, no per-share amounts | the table row of the fact in the XHTML; for a layout of positioned blocks, the text before the amount; else the package label; else the concept name | concept | calculation tree |
| IFRS text | every row of the three statements | as printed | none | none |
| PDF | every line the model copies today | as printed | none | none |

## Standard items

`item` puts lines from different formats and filers on one vocabulary, so a metric is written once.
It starts with the items the parsers already tell apart (the PDF extractor's line fields: revenue,
EBIT, depreciation, finance costs, net profit, the balance sheet totals, inventory, cash, the debt
kinds, operating cash flow, capex) and grows with phase 2 (land, work in progress, finished units,
contract liabilities, loans granted, interest paid, dividends paid, borrowings raised and repaid…).

How each format gets its `item`: first from the scorecard figures (each figure's source lines; this is
where a filer's swapped tags were already handled), then:

- KRS XML: a table of line codes and labels (the codes are the same for every company).
- ESEF: a table of IFRS concepts. An extension concept anchored to a wider one is part of it, so it only
  takes the anchor's item where an item is made of several lines (provisions, contract liabilities,
  borrowings raised or repaid, interest paid).
- PDF: the model already classifies each line; the list of items it can choose from grows (prompt
  version 5).
- IFRS text: the parser's existing label rules.

Adding an item later re-maps stored KRS and ESEF lines in code with no file read. PDF and IFRS text
lines have no code, so a new item there needs label rules, or a new model read for the PDFs that need it.

## How figures relate to lines

In this change the scorecard figures stay computed as they are now, and each figure's `source` list
points to lines. A later step (when phase 2 needs it) makes `deriveFigures(lines)` the one place that
computes figures, so changing a rule can recompute every stored year without the files. `check-filings`
must give the same figures before and after that step.

## Checks

Per year, on import: the balance sheet lines add up to total assets and to total equity and
liabilities, where `parent` is known (ESEF; KRS XML for equity and liabilities, its assets were checked
already); every PDF amount appears on its page (as before). A failed check goes into `checks`, as now. All
21 stored ESEF reports pass.

`review.status` is `parsed` on import, `hand-checked` for years in the test set
(`scripts/check-filings/expected.json`; `check-filings --mark` writes it), and `flagged` when someone
notes a problem.

## Size and reading

A primary statement set is 70–170 lines, 12–25 KB per year row for the stored ESEF reports; DynamoDB allows 400 KB. Today
the table is 59 rows, 118 KB. The lists the app reads (`getAll`, `getByIssuer` for the Financials page
and the scorecard) leave `lines` out with a projection; a new read returns them for one year.

## Filling the rows already in prod

A script `npm run reparse-filings` reads each stored original from the Filings bucket, parses it with
the new code and adds `lines`, `standard`, `presentedUnit` and `review` to its rows. It never changes
figures: if a re-parse gives a different figure, it reports it and leaves the row alone.

- ESEF (37 rows, 21 files): free.
- PDF (22 rows, 11 files): one model read each, about $1.65 in total. Done with prompt version 6; a re-read is a new model read, so the row records it as `linesExtraction`.

It runs on dev first, then prod.

## Steps

1. Types, KRS label and item tables, `lines` from each parser, with unit tests on the fixtures.
2. Import writes the new fields; reads leave `lines` out; `check-filings` checks lines too and gets
   `--mark`.
3. `reparse-filings`: dev, then prod.
4. Later, with phase 2: `deriveFigures(lines)`.

## Not in this change

- Showing lines in the app (phase 3 issuer page).
- Notes to the statements (segment data, debt maturities): only the three primary statements.
- Statement of changes in equity.
