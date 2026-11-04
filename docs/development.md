# Development

This app is developed and delivered per the [continuous-delivery standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/STANDARD.md): develop on `dev`, every push to `main` goes through `int` to `prod`. The standard has the general rules (stages, tests, the CD pipeline, versions, when a push needs a yes first, test users); this file holds what is specific to CatalystViewer and where it still deviates. Testing details (fixtures, reference date) are in [testing.md](testing.md); deploying from GitHub (OIDC role, policy) in [infra/github/README.md](../infra/github/README.md).

## Stages

| Stage | URL | Data |
|---|---|---|
| `dev` | https://dev.catalyst.albedoonline.com, or localhost with `npm run dev` | developer's choice |
| `int` | https://int.catalyst.albedoonline.com | fixtures, reset by the pipeline before the tests; fixture sources, fixed reference date ([testing.md](testing.md)) |
| `prod` | https://catalyst.albedoonline.com | real data; the Bonds Updater schedule runs only here |

Stage flags are in `infra/stage.ts`: `isProd`, `scheduleEnabled` (prod only), `useFixtures` and `referenceDate` (int), the AI and email stubs (every stage but prod), `siteDomain`. `prod` has `removal: retain` and `protect`.

**Auth:** the shared, manually managed Cognito pool `AlbedoUserPool` (`eu-west-1_IVai0KEAA`), users shared with other Albedo apps. Each stage has its own app client `catalyst-viewer-<stage>-web`, created by SST in `infra/api.ts`; the API authorizer accepts only its own stage's client. Every API handler (through `lambdaHandler` in `packages/functions/src/HandlerProxy.ts`) also requires a Cognito group: `catalyst-viewer` (real users) on every stage, `catalyst-viewer-test` (the test user) everywhere except prod (`accessGroups` in `infra/stage.ts`). Someone who should use the app is added to `catalyst-viewer` by hand.

**Test user:** `catalyst-viewer-test@albedoonline.com`, password in the SST secret `TestUserPassword` of `dev` and `int`; tests read both through `sst shell` (`Resource.TestUser`, `Resource.TestUserPassword`). Rotation: [the standard's test-user template](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/templates/test-user.md).

## Run locally

```sh
npm run dev -- --stage dev        # sst dev: Lambdas on your machine, Next.js dev server
npm run deploy -- --stage dev     # full deployment; use it in agent sessions
```

Stop `sst dev` when you're done: it holds `dev`'s lock and blocks every deploy to `dev`.

## Tests

| Kind | Command |
|---|---|
| Type check | `npm run typecheck` (infra and all packages) |
| Lint | `npm run lint`: [oxlint](https://oxc.rs/docs/guide/usage/linter) over the whole repo, config in `.oxlintrc.json`; warnings fail it |
| Unit (Vitest) | `npm test` |
| Seed a test stage | `npx sst shell --stage int -- npm run seed` (int or dev) |
| Integration (API) | `npx sst shell --stage int -- npm run test:integration` |
| E2E (Playwright) | `npx sst shell --stage int -- npm run test:e2e` |

**Lint** is oxlint, not ESLint: typescript-eslint (which ESLint needs to read TypeScript) uses TypeScript's JavaScript API, which TypeScript 7's npm package no longer has; oxlint has its own parser. `.oxlintrc.json` turns on the correctness rules (errors) and suspicious ones (warnings), the React hooks rules (`react/rules-of-hooks`, `react/exhaustive-deps`) and the Next.js rules for `packages/web`. Off: rules for the old JSX transform (`react-in-jsx-scope`), the React Compiler-era rules (`set-state-in-effect`, `purity`, the duplicate dependency checks: the app doesn't use the compiler, and they flag its load-on-open effects), and purely stylistic ones. A deliberately partial dependency list gets an `oxlint-disable` comment with the reason.

Integration and E2E tests expect the seeded fixtures and log in as the test user; details in [testing.md](testing.md).

## Testing the AI features locally

The two AI features, **issuer classification** (industry, summary, website) and **fundamental analysis** (financials and scorecard), run on Bedrock and Tavily only on `prod`; on `dev` and `int` they're stubbed (`AI_MODE=stub`, [testing.md](testing.md)). Deploying a change to them therefore shows nothing. Run them on your machine instead:

```sh
npm run classify-issuer -- "Kruk S.A."
npm run analyze-issuer -- "Dadelo S.A."
npm run analyze-issuer -- "Dadelo S.A." --model haiku_4.5 --out before.json
```

| Option | Meaning |
|---|---|
| `--model haiku_4.5` / `sonnet_4.6` / `opus_4.6` / `sonnet_5.5` | model for the analysis (default: `DEFAULT_MODEL_ALIAS` in `packages/core/src/ai/models.ts`, now `sonnet_4.6`, the same as on prod; `opus_4.6` is the strongest model the AWS account has quota for; `sonnet_5.5` is listed but its Bedrock quota is 0 for the account, as for every model from Opus 4.7 on, and an increase request was closed without a change on 2026-10-30); classification always uses the default |
| `--out <file.json>` | save the full result: the fields the app stores as the `#ANALYSIS` record (financials, scorecard, agent log, report) |

**Same code as the app.** The CLI (`packages/core/src/ai/issuers/cli.ts`) and the Lambdas (`packages/functions/src/issuers/classifyIssuer.ts`, `analyzeIssuer.ts`) call the same entry points, `runClassification` and `runAnalysis` in `packages/core/src/ai/issuers/IssuerAI.ts`. Prompts, tools (Stockwatch, Biznesradar, web search), parsing, scorecard and report are shared. Only the edges differ: the CLI prints the result and stores nothing, while the Lambdas write it to the `IssuerProfiles` table. Keep it that way: a new AI feature, or a new step in one of these, goes behind `IssuerAI.ts` so it can be run locally too.

**What it needs:**
- AWS credentials for the app's account with `bedrock:InvokeModel` (the model ARNs in `packages/core/src/ai/models.ts` are inference profiles in that account, `eu-west-1`; the region defaults to `eu-west-1` when `AWS_REGION` isn't set);
- `TAVILY_API_KEY` (from https://app.tavily.com; the GitHub secret of the same name can't be read back) in `.env.local` at the repo root (git-ignored; template: `.env.local.example`) or exported in the shell, which wins over the file. The npm scripts load the file with Node's `--env-file-if-exists`. Without the key the command stops before any paid call.

**Cost.** Without `AI_MODE=stub`, every run is a real, paid call to Bedrock and Tavily. An analysis is an agent loop of up to 10 model calls, plus tool calls. The command prints the tokens used at the end. Use `--model haiku_4.5` while iterating on plumbing, and Sonnet to judge the result.

**Free dry run.** `AI_MODE=stub npm run analyze-issuer -- "X"` goes through the same entry point with the stub answers. That's useful for checking the CLI and the scorecard and report formatting without paying.

**Feedback loop for a change to the AI features:**

1. Pick one or two issuers that show the problem (e.g. Dadelo, whose Stockwatch page had a part-year 2026) and save a baseline: `npm run analyze-issuer -- "Dadelo S.A." --out before.json` (on the unchanged code).
2. Change the code. Cover the deterministic parts with unit tests (parsers such as `StockwatchTool.test.ts`, scorecard rules in `scorecard.test.ts`, `npm test`).
3. Run again with `--out after.json` and compare, e.g. `diff <(jq .agentFinancials before.json) <(jq .agentFinancials after.json)` and the same for `.scorecard`.
4. Push to `main` (AI changes need a yes first, see [Delivery](#delivery)). `int` runs only the stubs, so the local run in step 3 is the check of the real AI behaviour.

Changes to the scorecard rules alone don't need a new analysis: the issuer list recomputes scorecards from the stored figures (`currentScorecard` in `packages/functions/src/issuers/getIssuerProfiles.ts`).

The CLI runs through `esrun --send-code-mode=temporaryFile` (see `package.json`): the bundled code is too large to pass on the command line (`spawn E2BIG`).

## Importing filed statements (KRS)

The whole method, from a bond name to a judgement (identity, industry, reports, rules, refinancing, confidence, known exceptions), is in [fundamental-analysis-methodology.md](fundamental-analysis-methodology.md). Keep it current with every rule or source change.

The scorecard uses an issuer's own annual statements instead of the AI-collected figures whenever the issuer has any: they're read in code, every figure keeps the statement lines or XBRL concepts it came from, and the statement is checked for consistency. Four formats, detected from the file:

| Format | Who files it | Where to get it | Read by |
|---|---|---|---|
| KRS XML (`.xml`) | companies under the Polish accounting act, most unlisted issuers | https://rdf-przegladarka.ms.gov.pl: search by KRS number, download the XML of *Roczne sprawozdanie finansowe* (and *Skonsolidowane …* for groups); signed files are fine | `FilingParser.ts`: fixed line codes |
| ESEF (`.zip`, or `.xhtml` with inline XBRL) | listed companies reporting under IFRS; the consolidated statements are tagged | the issuer's investor relations site, or the KRS financial documents browser (the report package zip). Older years (2020–2023): https://filings.xbrl.org | `EsefParser.ts`: IFRS taxonomy tags |
| IFRS text (`.xhtml`, `.html`) | listed companies' separate (single-company) statements, which are not tagged | as ESEF, the `…-1-pl.xhtml` report | `IfrsTextParser.ts`: line labels, best effort; not extended further (each layout needs its own patches), use the PDF route |
| PDF (`.pdf`) | unlisted IFRS reporters (e.g. P4), foreign issuers, issuers whose website only has the PDF | the issuer's investor relations site | `AiPdfExtractor.ts`: a model copies the statement lines, code checks them (below) |

The KRS repository has no API and blocks automated downloads, so files are downloaded by hand. To sort a folder of downloads before importing, `npm run sort-filings -- <folder>` (no stage needed; Windows paths work) reads each file, also inside zips and signed `.xades` files, and prints the company, KRS number (an ESEF package's from GLEIF), scope, fiscal year and main figures, with the failed checks, duplicates, part years and a wrong scope or year against `scripts/sort-filings/checklist.json` (the missing reports, as on the KRS report checklist page); `--copy` or `--move` files them into `<folder>/sorted/<KRS>-<company>/FY<year>-<scope>.<ext>` (`--to` for another folder). PDFs aren't parsed (that's a paid model call on import), but their text gives the KRS number, fiscal year and group or single for free, so they're checked, de-duplicated and sorted too. A signature file is reported, not skipped, when it looks like it holds a statement the parser can't open. Prefer the ESEF package (the zip) over the bare `.xhtml`: it carries the filer's calculation tree, anchors and labels, which are needed to find debt lines the filer tagged with its own concepts. Then import into a stage:

```sh
npm run import-filing -- --dry-run statement.xml report.zip                     # parse only, no stage: check the figures
npx sst shell --stage dev -- npm run import-filing -- --dry-run report.zip         # also match the issuer and check the registers, write nothing
npx sst shell --stage prod -- npm run import-filing -- statement.xml group.xml report.zip
npx sst shell --stage prod -- npm run import-filing -- statement.xml --issuer "Dadelo S.A."
npx sst shell --stage prod -- npm run import-filing -- separate.xhtml --krs 0000031483
npx sst shell --stage prod -- npm run import-filing -- annual-report.pdf --dry-run      # PDF: one paid model call per run, dry or not
npx sst shell --stage prod -- npm run import-filing -- annual-report.pdf --issuer "Pepco Group NV" --lei 213800OVMJPFP79OB449   # foreign issuer, no KRS
```

| Option | Meaning |
|---|---|
| `--issuer "<name>"` | the issuer's name as in the app, when the company name in the filing doesn't match one (legal forms are ignored: "DADELO SPÓŁKA AKCYJNA" matches "Dadelo S.A."); one file at a time |
| `--krs <number>` | the company's KRS number, when the filing doesn't give one (IFRS text, PDF) or the PDF's text gives a subsidiary's; one file at a time |
| `--lei <code>` | the company's LEI, for a foreign issuer with no KRS number (look it up at [GLEIF](https://search.gleif.org)); KRS numbers in the text are then ignored and the rows are stored under `LEI:<lei>`; one file at a time |
| `--dry-run` | everything but the writes (a PDF still costs its model call) |
| `--force` | store a filing whose consistency checks failed, or one of a second company for the same issuer |
| `--model <alias>` | PDFs only: the model that reads the statements (default: the app's default model, now `sonnet_4.6`), e.g. `opus_4.6` |

Several files can be imported in one run; `--issuer`, `--krs` and `--lei` work with one file at a time. Without `sst shell`, only `--dry-run` works, and only parses (no issuer matching, no registers).

What happens:

- **Company:** KRS XML and IFRS text carry the KRS number; ESEF carries the LEI, and the KRS number comes from the LEI register (GLEIF, registration authority RA000484). The KRS number is checked against the KRS register API; a different registered name is a warning (companies get renamed). A company registered abroad (e.g. Allegro.eu, Luxembourg) is stored under `LEI:<lei>`.
- **Issuer:** matched by the filing's company name or the registered name (legal forms ignored), or by `--issuer`. A second company for the same issuer is refused without `--force`.
- **Storage:** the original file goes to the `Filings` bucket (`filings/<entityId>/…`), one row per fiscal year to `IssuerFinancials` (key: entity id = KRS number or `LEI:<lei>`, `<period end>#single|group`). A filing has two columns, its own year and the previous one; the previous year is stored too, unless that year's own filing is already there. Importing the same file again overwrites the same rows.
- **Scorecard:** the issuer list scores the issuer from these rows: group accounts if there are any, otherwise single-company ones, full years only, at most five; unless its AI analysis has a later fiscal year, which then stays (an old filing doesn't replace newer figures). The issuer card names the source.

How figures are derived where the format leaves a choice (the importer prints these as notes):

- **Financial debt:** KRS XML: loans, bonds, other financial liabilities (incl. leases) and bills of exchange owed to third parties. ESEF: the borrowing, bond, loan and lease lines that the filer's calculation tree sums into current and non-current liabilities; the filer's own concepts count when anchored to an IFRS debt concept or labelled as one; standard IFRS concepts for a side the tree doesn't cover, or without the package. A balance sheet in order of liquidity (financial companies such as debt collectors, with no current and non-current liabilities) takes the debt lines under total liabilities; when the filer tags its one "credits, loans, bonds and leases" line as financial liabilities at amortised cost, that line is used, with no bond split. IFRS text: balance sheet lines labelled as loans, borrowings, bonds, debt securities or leases, not interest payable.
- **EBIT:** ESEF: `ProfitLossFromOperatingActivities`, unless the calculation tree sums the operating lines (gross profit, selling costs, …) into another line of profit before tax; that line is used then, with a note (Orlen FY2024 swapped the tag with the share of associates).
- **Interest:** ESEF filers rarely tag interest expense; finance costs are used then.
- **Revenue:** an ESEF report without a revenue total gets the filer's operating income total when its calculation tree has operating profit as income less operating expenses (financial companies, e.g. KRUK: interest income on debt portfolios, services, portfolio sales); otherwise the sum of its revenue lines.
- **Depreciation:** without a standard ESEF depreciation tag, the filer's own cash flow line for depreciation and amortisation is used; when it includes impairment (e.g. Cyfrowy Polsat's "depreciation, amortisation, impairment and liquidation"), the tagged impairment losses are taken off.
- **Current assets and liabilities:** ESEF filers with assets held for sale may tag only the totals excluding them; those are used, plus the held-for-sale lines.
- **Checks:** assets = equity and liabilities, assets = current + non-current (KRS XML and ESEF), net profit in the income statement = in the balance sheet (KRS XML). IFRS text is accepted only when total assets tie to total equity and liabilities; check its figures against the document all the same.

**PDF reports** (`.pdf`, e.g. unlisted IFRS reporters like P4, or an issuer whose website only has the PDF) are read by a model and checked in code (`AiPdfExtractor.ts`):

1. code reads the PDF text (pdfjs-dist) and picks the statement pages: a statement heading (Polish, English or Hungarian) near the top of a page that is mostly table lines (lines ending in an amount, so narrative pages with numbers in their prose don't count), plus the next page; the table of contents is skipped;
2. the model (`--model`, default the app's default model) copies every line of the balance sheet, income statement and cash flow statement through a tool with a fixed schema: label, page, the amount per fiscal-year column exactly as printed, and the standard item it is (revenue, total assets, bonds, bank loans, leases, combined financing, …). It doesn't compute anything;
3. code turns the printed amounts into numbers and sums the figures; checks: every amount is on its page, total assets = total equity and liabilities, equity and net profit are there. A failed check refuses the import, as for other formats.

Details:

- **Number format:** Polish ("1 792,2", "1.792,2") or English ("1,792.2"), decided per report from the printed amounts; English reports get a note. Some English-language reports (e.g. Polenergia) still print Polish numbers.
- **Retry:** when the answer has no lines at all for a statement (the model sometimes stops after the income statement), the model is asked once more and the fuller answer kept; that costs a second call.
- **UK-style balance sheets** (net assets, no "total equity and liabilities" line, e.g. Pepco): total assets are checked against equity + total liabilities.
- **Totals:** when the model also tags the lines that make up current assets or current liabilities as those totals, the largest line (the total) is used. Depreciation sums the cash flow lines (IFRS 16 reports may show right-of-use depreciation separately).
- **Company:** a KRS number read from the text whose registered name differs from the report's company name (one name not containing the other) is refused as probably a subsidiary's from the list of group companies; pass `--krs`, or `--lei` for a foreign issuer.

One call per report (two with a retry), ~8k tokens in and ~10k out (≈ $0.15 with Sonnet 4.6). The row records the model, prompt version and pages read (`filing.extraction`). The KRS number is taken from the text (also without leading zeros) or the LEI next to "LEI"; a PDF with neither is refused before the model call unless `--krs` is given. Lines that combine loans and bonds ("financial liabilities") count as debt with no bond split.

**Issuer identity** (`packages/core/src/bonds/issuers/identity.ts`, `scripts/resolve-issuers/`; design `docs/superpowers/specs/2026-11-03-issuer-identity-design.md`): each issuer name has an `#IDENTITY` row in `IssuerProfiles`: its company from the LEI register (GLEIF): LEI, legal name, country, register number (the KRS for Polish companies), LEI status, parent, and `financialsEntityId`, whose reports its scorecard uses (the group's, for a financing vehicle). Found by the bonds' ISINs, else by an exact name match; a match whose legal name differs from the bond name is kept as `review`. Names of one company show as one issuer card; reports are joined by company, not by name; imports find the issuer by its KRS number or LEI.

```sh
npx sst shell --stage prod -- npm run resolve-issuers                          # names without an identity: dry run
npx sst shell --stage prod -- npm run resolve-issuers -- --write               # store them
npx sst shell --stage prod -- npm run resolve-issuers -- --name "PKN Orlen S.A." --krs 0000028860 --write
npx sst shell --stage prod -- npm run resolve-issuers -- --name "Orlen Capital AB (publ)" --financials-from parent --write
npx sst shell --stage prod -- npm run resolve-issuers -- --name "PZU S.A." --confirm --write
```

New issuers get theirs in the Bonds Updater: after an issuer's classification, the `ResolveIssuerIdentity` step looks it up the same way and stores it (an existing identity is left alone, so hand-set and confirmed ones stay); the report email shows the company found, or why none was. A failure there only notes it in the report. The script is for the manual cases and for names classified before this step.

**Checking the imports** (`scripts/check-filings/`): `expected.json` holds, for every imported report, the figures of its own fiscal year (revenue, net profit, total assets, equity, cash, plus a few regression figures), read by hand from the printed statements, not from the parser. The check compares them with the stored rows and with a fresh parse of the original files in the `Filings` bucket:

```sh
npx sst shell --stage prod -- npm run check-filings                    # stored rows + re-parse of KRS XML / ESEF / IFRS text (free)
npx sst shell --stage prod -- npm run check-filings -- --only orlen    # one issuer
npx sst shell --stage prod -- npm run check-filings -- --pdf           # also re-read the PDFs with the model (~$0.15 each)
npx sst shell --stage prod -- npm run check-filings -- --mark          # mark the passing years "hand-checked"
```

Run it after any change to the parsers or the PDF prompt. When importing a new report, check its figures against the document, add it to `expected.json` and run it with `--mark`. It also checks each year's statement lines (all three statements there, the total assets line equal to the figure).

**Statement lines** (`statementLines.ts`): every year row also keeps every line of its balance sheet, income statement and cash flow (`lines`; 10–40 KB a row), so new metrics can be computed from stored data without the files. Per line: statement, order, label as printed, value in units of currency, the filing's own identifier (`code`: KRS line code or XBRL concept), the wider IFRS concept an ESEF extension is anchored to, the subtotal it adds up into (`parent`, KRS XML and ESEF), the page (PDF), and the app's standard item (`item`, from the list `LINE_ITEMS`: revenue, cost of sales, PP&E, trade receivables, the debt kinds, contract liabilities, interest paid, borrowings raised and repaid, …). The row also has `standard` (`ifrs` or `pl-uor`), `presentedUnit`, `lineSigns` and `review` (`parsed`, `hand-checked`, `flagged`).

- **KRS XML:** every line code with an amount; labels from the Ministry of Finance schemas (`krsLineLabels.ts`, generated from `JednostkaInnaStrukturyDanychSprFin_v1-0.xsd` and its consolidated counterpart); the parent is the element a line sits in. Amounts as filed (a cost is positive).
- **ESEF:** the concepts of the package's presentation roles for the three statements (the role holding the statement's key concepts with the most amounts; changes in equity is told apart by holding equity), in the filer's order; labels from the report's table row (or, for a layout of positioned blocks, the text before the amount), else the package label, else the concept name; the parent from the calculation tree. Amounts as tagged (a cost is positive). A report without its package gets every tagged amount in document order, sorted into statements by period type and name.
- **IFRS text and PDF:** every row as printed (a cost in brackets is negative); PDF items are the model's classification.
- **Items** come from the scorecard figures first (so a filer's swapped tags are handled once), then a table per format (KRS codes and labels, IFRS concepts). An ESEF extension anchored to a wider concept is part of that item, so it only gets it for items made of several lines (provisions, contract liabilities, borrowings).
- **Checks:** where parents are known, the lines under total assets and under total equity and liabilities must add up to them (KRS XML: equity and liabilities only, assets are checked already).
- The list reads (`getAll`, `getByIssuer`, `getByEntity`) leave `lines` out; `IssuerFinancialsTable.get` returns one year with them.

Rows imported before lines were stored get them with `reparse-filings`: it parses each stored original again and adds the lines and new fields, never changing figures (a year whose re-parsed figures differ is reported and left alone):

```sh
npx sst shell --stage dev -- npm run reparse-filings -- --dry-run      # parse and compare, write nothing
npx sst shell --stage dev -- npm run reparse-filings                   # KRS XML, ESEF, IFRS text (free); PDFs skipped
npx sst shell --stage dev -- npm run reparse-filings -- --pdf          # PDFs too: one model read each (~$0.15)
```

A PDF re-read is a new model read, so its lines are recorded with the read they came from (`linesExtraction`: model, prompt version, pages). The model doesn't answer the same way every time, even at temperature 0 (Polenergia: once the "revenue from contracts" line, once the "sales revenues" total), which is why a re-read whose figures differ is left alone.

Not supported: small and micro entities (`JednostkaMala`, `JednostkaMikro`), banks and insurers, scanned PDFs (no text layer).

**Item totals:** each year also stores `items`, the sum of its lines per line item (`itemTotals` in `statementLines.ts`), so the scorecard's sector rules get leases, buyer advances, interest paid and write-downs without reading the lines. Import and `reparse-filings` write it with the lines; `item-totals` recomputes it for the stored years (dry run unless `--write`; it compares the totals with the figures made of the same lines):

```bash
npx sst shell --stage dev -- npm run item-totals [-- --write] [-- --only "<issuer>"]
```

Write-downs of non-financial assets (line item `impairment`) are found by code in every format (`markWriteDowns`), not asked of the PDF model. The scorecard rules per sector (developer, contractor, consumer and services, general) are in `scorecard.ts`; design: `docs/superpowers/specs/2026-11-03-sector-rules-design.md`.

**Viewing the figures:** an issuer card with imported reports shows a *Reports <year>* chip (click it for the figures) and, expanded, where the company is registered (country, KRS or local register number, LEI; stored with each row as `registration` on import). The card's *Financials* button opens the yearly figures (`GET /api/issuers/{name}/financials`, `getIssuerFinancials.ts`): every imported year with its source, notes, checks and a 15-minute link to the original file, plus the AI analysis's years. Its *Full statements* switch shows one imported year's stored lines as the report printed them (balance sheet, income statement, cash flow; subtotals indented from the parent chain and bold, the standard item per line, the PDF page; `GET /api/issuers/{name}/statements?period=YYYY-MM-DD&scope=group|single`, `getIssuerStatements.ts`), loaded only when picked. Code: `packages/core/src/bonds/fundamentals/filings/`, `scripts/import-filing/`.

## Delivery

| File | Trigger | What it does |
|---|---|---|
| `.github/workflows/continuous-delivery.yaml` | push to `main` (except `docs/**`, `**/*.md`), manual | checks → deploy int → seed → integration and E2E tests → tag `v1.N` → deploy prod from the tag → site and API answer (no login) |
| `.github/workflows/pull-request-checks.yaml` | pull request (Dependabot's too) | typecheck, lint, unit tests, site build; no AWS access |
| `.github/dependabot.yml` | weekly (npm), monthly (actions) | version update PRs; security update PRs come from the repo setting ([dependabot standard](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/dependabot/STANDARD.md)) |

- Rollback or redeploy: run Continuous Delivery manually from the release tag ("Use workflow from"; `gh workflow run continuous-delivery.yaml --ref v1.6`). It deploys the tag to int, seeds it, runs the tests, then deploys it to prod, without a new version. Works for `v1.5` and later; `v1.0.0`–`v1.4` predate `continuous-delivery.yaml` and can't be rolled back this way.
- Releases are `v1.N`, forward only, shown in the app's menu (top right, "Version …"; `local` for a deploy from a machine). Until 2026-10-26 they were `vX.Y.Z` from conventional commits (`v1.0.0`–`v1.1.2`); `v1.2` was tagged on the commit prod ran then (`8a7b159`, same as `v1.1.2`), and `continuous-delivery.yaml` continues from there.
- `TAVILY_API_KEY` (web search for the AI steps) is a GitHub secret, passed to `sst deploy` as an environment variable.

Ask before pushing changes that touch data, resources holding data, access or cost ([the standard, section 5](https://github.com/jakubprzybytek/agent-playbook/blob/main/skills/continuous-delivery/STANDARD.md#5-when-a-push-needs-a-yes-first)). For this app that includes changes to the Bonds Updater schedule, the state machines, and the AI (Bedrock, Tavily) calls.

## Deviations

- **Deploying from Windows needs Developer Mode and an extra build step.** Next.js links some packages in the build (e.g. `.next/node_modules/aws-amplify-<hash>`) with symlinks; Windows creates them only with Developer Mode on, and they point to the absolute `D:\…` path, which doesn't exist on Lambda. On Windows, `infra/web.ts` runs `scripts/site-build/windows-links.mjs` after the OpenNext build to replace them with copies; builds on Linux (CI) are unchanged. OpenNext also fails to install the image optimizer's dependencies on Windows; the app doesn't use `next/image`, so it has no effect. Ends when OpenNext/Next.js handle these on Windows.
- **Workflows run on `ubuntu-24.04`, not `ubuntu-latest`.** GitHub moved `ubuntu-latest` to Ubuntu 26.04 in October 2026, and Playwright 1.60 can't install Chromium there (`Playwright does not support chromium on ubuntu26.04-x64`). Ends when Playwright is upgraded to a version that supports 26.04 and the E2E tests pass on it.
