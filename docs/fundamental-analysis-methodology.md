# Fundamental analysis of Catalyst bond issuers: methodology

Everything worked out so far about judging whether a bond issuer can pay its bonds back, written so
that an analyst, Claude, or the app's AI agent can do the whole analysis from nothing but a bond name.
State on 2026-11-04 (release v1.63), with bond-terms knowledge from PortfolioTracker and what the first real KRS downloads taught. What the app already does is marked **built**; what is decided
but not built is marked **planned**.

The design records behind it are in `docs/superpowers/specs/` (listed at the end). When this document
and the code disagree, the code is right and this document needs fixing.

## Contents

1. [The question and the output](#1-the-question-and-the-output)
2. [The procedure in brief](#2-the-procedure-in-brief)
3. [Step 1: the bond](#3-step-1-the-bond)
4. [Step 2: the company behind the bond](#4-step-2-the-company-behind-the-bond)
5. [Step 3: industry, scope and rule set](#5-step-3-industry-scope-and-rule-set)
6. [Step 4: getting the reports](#6-step-4-getting-the-reports)
7. [Step 5: reading the reports](#7-step-5-reading-the-reports)
8. [Step 6: figures when there is no report](#8-step-6-figures-when-there-is-no-report)
9. [Step 7: the scorecard](#9-step-7-the-scorecard)
10. [Step 8: refinancing](#10-step-8-refinancing)
11. [Step 9: data confidence](#11-step-9-data-confidence)
12. [Step 10: the judgement](#12-step-10-the-judgement)
13. [Presenting the result](#13-presenting-the-result)
14. [Known issuers and exceptions](#14-known-issuers-and-exceptions)
15. [Not covered yet](#15-not-covered-yet)
16. [Where things are](#16-where-things-are)

---

## 1. The question and the output

**The question:** how likely is this issuer to fail to pay interest or principal on its bonds? It is not
a valuation: no fair price, no DCF, no equity upside. It is for retail and semi-professional bondholders.

**The output** for one issuer:

| Part | What it is |
|---|---|
| Identity | the company (legal name, country, KRS and/or LEI), whose accounts are used, other names of the same company |
| Industry and rule set | e.g. Developer → developer rules |
| Scorecard | 6 dimensions plus Refinancing, each green / yellow / red / n/a, with the metrics behind each |
| Data confidence | high / medium / low, with the facts: source, year, how far behind, metrics computed and missing |
| Judgement | a short written verdict: the reds that matter, what offsets them, red flags outside the metrics |
| Sources | each figure traceable to a document, statement line and year |

**No aggregate score.** Five greens and one red is a different story from two greens and four reds;
one number would hide it. The reader sees the dimensions and draws the conclusion, helped by the
written judgement.

---

## 2. The procedure in brief

```
bond name (e.g. "ATA0128") or ISIN
  1. bond        → ISIN, issuer name as listed, type, amount, currency, maturity       (Catalyst, obligacje.pl)
  2. company     → LEI, KRS, legal name, country; group or financing vehicle            (GLEIF, KRS API)
  3. industry    → rule set (developer / contractor / consumer / general), or out of scope
  4. reports     → latest full-year annual report(s), group accounts first             (KRS repository, issuer site, ESPI/EBI)
  5. read        → statement lines → figures, checked (balance ties, net profit ties)
  6. no report?  → AI-collected figures as a fallback, marked as such
  7. scorecard   → 6 dimensions with the rule set's metrics and thresholds
  8. refinancing → listed bonds due in 12 / 24 months vs cash and operating cash flow
  9. confidence  → high / medium / low with facts
 10. judgement   → verdict, red flags, what to watch
```

Each step below says what to do, where the data is, the rules, and the traps found so far.

---

## 3. Step 1: the bond

**Where:**

- **Catalyst** (GPW's bond market, catalyst.gpw.pl): daily statistics per bond: ISIN, market
  (GPW or BondSpot), bond type (corporate, municipal, treasury, covered), nominal value, maturity date,
  trading currency, current coupon, accrued interest, quotes. The app reads them three times a working
  day.
- **obligacje.pl**: `https://obligacje.pl/pl/obligacja/<BOND NAME>`. It gives the issuer name, the
  issue value ("Wartość emisji w obrocie") and the interest schedule (fixed, or WIBOR/EURIBOR + margin).
  **Its robots.txt blocks AI crawlers and assistants (ClaudeBot, Claude-User, GPTBot, …): an AI agent
  must not fetch it.** Use the app's stored bond data (`BondDetails`, filled by the Bonds Updater), the
  Catalyst file, or the issuer's terms of issue instead.
- In the app: the `BondDetails` table (`getActive('Corporate bonds')`).

**Rules:**

- A bond can be listed on both GPW and BondSpot. **Count each ISIN once.**
- The **issuer name on the bond is not the company's identity.** It can be an old name, a merged company or a
  financing vehicle (see step 2).
- The **amount is as issued** (`issueValue`). Early or partial redemptions aren't published per bond
  in the data read, so the outstanding amount may be lower.
- Currency: about 8% of active bonds are in EUR (Kruk, Echo, Orlen); the rest in PLN.
- An issuer's **other bonds** matter as much as this one: maturities are judged over all the
  company's listed bonds, under all its names (step 8).

### A bond's nominal value can change

The nominal value of a bond isn't fixed. Read it **from Catalyst's daily statistics file on the day
you need it**, never once at listing. Found on 2026-11-04 (from PortfolioTracker's work and a check of
prod): 53 of 1,051 listed bonds had a nominal different from the one CatalystViewer stored when it first
saw them. Until 2026-11-04 CatalystViewer stored the nominal once and never updated it, so yields,
accrued interest and the amount outstanding were wrong for these bonds. It now updates it on every run.

**Instalment redemptions (amortising bonds).** Part of the principal is repaid before maturity, so the
nominal per bond falls:
- 45 municipal bonds (e.g. Kraków KRA0528 1,000 → 500, Radomsko RMS1126 940 → 200);
- 2 corporate: Kruk KRU0228 (1,000 → 550) and Resi Capital RES0228 (1,000 → 709.27);
- more were probably first seen after an instalment (corporate bonds with nominals of 500, 550, 600).

For these:
- **Amount outstanding** = issue value × current nominal / the nominal on the day the issue value was
  read. KRU0228: prod read 350m PLN at nominal 1,000, dev read 192.5m at 550, both 192.5m outstanding now.
  **Built (2026-11-04):** the Bonds Updater stores the current nominal from the Catalyst file on every run
  and keeps the issue-day one (`issuedNominal`); Refinancing counts the amount owed (`amountOwed` in
  `maturities.ts`).
- obligacje.pl's "Wartość emisji w obrocie" is the amount **in circulation on the day it's read**. It
  also changes with new tranches (taps) and buy-backs. The app reads it once, so those go unseen. IZ0836
  read 1.1bn PLN in prod and 24.2bn on dev, because the Treasury keeps issuing it.
- **Instalments are payments due before maturity.** For refinancing, they belong in the 12 and 24
  month windows on their own dates (from the terms of issue), not only the final redemption.
- **Interest and accrued interest** run on the current nominal.

**Inflation-linked treasury bonds (IZ series: IZ0831, IZ0836).** Nominal = 1,000 PLN × the index ratio,
which follows CPI with a three-month lag:

```
W(n)       = ROUND(100 × Π (1 + WR_k), 5)          monthly reference index chained from 2003-07; WR_k = CPI m/m of month k
Ref(d)     = W(M−3) + (day−1)/daysInMonth(M) × (W(M−2) − W(M−3))     for a date d in month M
ratio(d)   = ROUND(Ref(d) / BaseRef, 5)            BaseRef of IZ0836 = 194.28509 (= Ref of its issue date, 2023-08-25)
nominal(d) = 1000 × ratio(d)
accrued(d) = ROUND(1000 × coupon × days since coupon start / days in coupon period × ratio(d), 2)   IZ0836: 2 %, from 25 Aug
```

- The formula reproduced every published Ministry of Finance value checked (PortfolioTracker, 11 of 11).
- It is taken at the **settlement date** (T+2 working days, Polish holidays excluded). Catalyst's file on
  the session of 2026-11-03 gave IZ0831 1,079.85 and IZ0836 1,109.02, the Ministry's ratios for
  2026-11-05.
- The **gpw.pl archive's "Cena nominalna" column is unreliable for IZ**: since 2025-09-29 it mostly
  shows 1,000.
- A month of negative CPI lowers the nominal three months later.
- Treasury bonds are outside the scorecard, but a yield or value for an IZ bond must use the indexed
  nominal.

### Coupons and accrued interest

- **Prices are clean**, in % of nominal. Value = clean price × nominal + accrued interest.
- **Corporate coupons:** ACT/365. Per bond: nominal × rate × days since the period started / 365,
  rounded to the grosz.
- Counted to the **settlement day** of a trade (T+2) as Catalyst quotes it.
- From the **record day** the whole coupon goes to whoever holds the bond that day. A bond bought on
  the record day, or the business day before, doesn't get it.
- **Fixed coupons** ("stałe 7.5%") have one rate for every period.
- **Floating coupons** (WIBOR 3M/6M, or WIRON, + margin) have a new rate each period. obligacje.pl shows
  only the current period's rate, never past ones, and no free WIBOR/WIRON fixing source was found.
- **obligacje.pl has had errors.** On 2026-10-14 the last two record days of PLY1227 were listed a period
  early. Treat a record day outside its period (more than 31 days before the payment) as wrong. A new
  period's rate can show the old rate for a few days.
- **Fixed-rate treasury bonds** (DS, PS, WZ): terms from the Ministry's calculator (sheet "Stałe").

---

## 4. Step 2: the company behind the bond

Bonds have to be joined to reports **by company, not by name**. **Built:** a `#IDENTITY` row per issuer name.

### How to find it

1. **ISIN → LEI** (GLEIF's ISIN mapping, open data, CC0):
   `GET https://api.gleif.org/api/v1/lei-records?filter[isin]=<ISIN>`.
   Try up to 3 of the issuer's ISINs. This resolved 162 of 208 issuer names.
2. **Name search, exact only:** `GET https://api.gleif.org/api/v1/lei-records?filter[fulltext]=<name without legal form>&page[size]=10`.
   Accept only when **exactly one** result has the same name once legal forms (S.A., Sp. z o.o., SE,
   spółka akcyjna, …) are removed. This resolved 30 more.
3. **By KRS:** `filter[entity.registeredAs]=<KRS>`; by LEI: `/lei-records/<LEI>`; parent:
   `/lei-records/<LEI>/direct-parent`.
4. **Otherwise by hand**, from the company's site or filings. 16 needed this, e.g. Pekao, CCC, LPP,
   Grenevia (formerly Famur), municipalities, PKN Orlen (Orlen's old name), i2 Development.

Rate limit: GLEIF allows 60 requests a minute; send about one a second.

The LEI record gives the legal name, country (jurisdiction), the local register and number, the
category (`GENERAL`, `FUND`, `RESIDENT_GOVERNMENT_ENTITY`, …), the LEI status (`ISSUED`, `LAPSED`,
`RETIRED`) and the parent.

- A **Polish company's KRS number** is the register id when the registration authority is
  **`RA000484`**.
- Check it against the **KRS register API**, which is open:
  `GET https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/<KRS>?rejestr=P&format=json`. It gives the
  registered name, NIP and REGON. A different registered name is a warning (companies get renamed),
  not an error.

### Rules

- **The entity id** is the KRS number for a Polish company, else `LEI:<lei>` (Allegro.eu and Żabka in
  Luxembourg, Pepco in the Netherlands/UK, MOL in Hungary).
- **Names whose identities share an entity are one company.** Show them as one issuer with "also issued
  as …" and all their bonds.
- **A financing vehicle uses its group's accounts:** `financialsEntityId` points at the group.
  Example: Pepco's bonds are issued by PEU (FIN) PLC (UK), which is wholly owned by Pepco Group N.V. and
  guaranteed by it. Check the guarantee in the bond terms; without one, the bondholder's claim is
  only on the vehicle.
- **When the LEI's legal name differs from the bond name, review before confirming.** It may be the
  same body in another form ("Miasto Łódź" = "ŁÓDŹ-MIASTO NA PRAWACH POWIATU"), a rename or merger
  (Santander → Erste, Kredyt Inkaso → Best), a financing vehicle, or a wrong mapping.
- **A lapsed LEI** is shown as such. It is a small sign of administrative neglect.
- **Country matters:** a foreign issuer has a different insolvency regime, and its filings aren't in
  the KRS. Show the country on every issuer.

### Holding companies (planned)

When the bond is issued by a holding company and the debt sits in subsidiaries, the holding's
bondholders rank **behind** the subsidiaries' creditors (structural subordination). Use the group
accounts for the figures, but flag it.

---

## 5. Step 3: industry, scope and rule set

### Industry (built)

One industry per issuer from a fixed list, chosen by an AI classification step with web search. The
legal name is often not the brand ("P4 Sp. z o.o." is the Play mobile network).

`Developer, Finance, Health Services, Energy, Retail, Manufacturing, Municipal, Telecommunications,
Transportation & Logistics, Media, Construction, Other`

The classification also stores a 2–3 sentence business summary and the official website.

### Scope

| Industry | Scorecard | Why |
|---|---|---|
| Finance (banks, mortgage banks, insurers, state bodies) | none | regulated or state-backed; an operating-company scorecard misleads |
| Finance: non-bank lenders (debt collectors, leasing, factoring, lending, investment firms) | none yet (planned: finance rules) | borrowing is their business. Net debt / EBITDA is always high, revenue isn't meaningful, and operating cash flow is negative while they grow (portfolio purchases are operating outflows) |
| Municipal | none | public bodies |
| everything else, and unclassified | yes | |

Out-of-scope issuers still get the bond schedule and the identity, just no colours.

**Finance subcategories (planned):** debt collector; leasing, factoring and lending; investment firm or
fund; bank; insurer; state or public institution. Only the first three would be scored.

Catalyst's largest default, GetBack (2018), was a debt collector, so these matter.

### Rule set (built)

| Rule set | Industries |
|---|---|
| developer | Developer |
| contractor | Construction |
| consumer and services | Retail, Telecommunications, Media, Other |
| general | Energy, Manufacturing, Health Services, Transportation & Logistics, unclassified |

**Per-issuer overrides** apply where the industry's rules don't fit the business model:

- **AB S.A. → general.** It's an IT distributor classified Retail. It holds stock on its own money,
  unlike a shop, so the consumer rules' operating cash flow / current liabilities made it red for the
  wrong reason.

A new override needs a stated reason (`RULE_SET_OVERRIDES` in `scorecard.ts`).

---

## 6. Step 4: getting the reports

### Which report

- The **annual report** (audited) of the **latest full fiscal year**.
- **Group (consolidated) accounts first:** they include the subsidiaries' debt. Use single-company
  accounts only when there are no group ones. **Never mix** the two across years.
- **12-month years only.** A quarter or half-year summed into a "year" breaks every ratio (Dadelo's
  "2026" was Q1 only).
- **Fiscal year ends vary:** Pepco and AB end on 30 September.
- **The most recent report wins (built 2026-11-05):** when a year appears in two reports, the newer report's
  figures are kept, its comparative column included: companies restate earlier years (Indos's 2024 profit became
  a loss; Unibep, PGE, Orlen, Allegro.eu, Vehis restated too). The older report still gives the year before.
  Exceptions are recorded per issuer: Vindexus FY2024 keeps its own report (the newer one hides the bonds), and
  Pepco FY2024's original report isn't imported (different perimeter).
- **Three years at least** for the trend. Each report carries its previous year as a comparative
  column, so two reports give three years. 23 of the 27 imported issuers have only 2 years today.
- **When the report is due:** annual reports are approved within 6 months of the year end, then filed.
  Treat a year as due **9 months** after it ends. On 2026-11-04 that means FY2025.

### Where

| Source | What | Access |
|---|---|---|
| **KRS financial documents repository**, https://rdf-przegladarka.ms.gov.pl | every Polish company's filed annual accounts since 2018: KRS XML for Polish GAAP filers, and the ESEF package (zip) or PDF for IFRS filers | search by KRS number. **No API, and Imperva bot protection:** download by hand only, never work around it (also not with a script someone else runs). Paid APIs with the same documents: MGBI, Transparent Data. What the downloads look like: "Downloading by hand", below |
| **The issuer's investor relations site** | annual reports (ESEF zip, XHTML, PDF) | usually "Relacje inwestorskie" → "Raporty okresowe". Some sites reject automated downloads (Orlen, PGE): download by hand, don't work around it |
| **ESPI / EBI** (the GPW current and periodic report systems) | listed and Catalyst issuers' periodic reports and current reports (defaults, rating changes, bond buy-backs) | via the issuer's site or GPW |
| **filings.xbrl.org** | ESEF packages, older years | `https://filings.xbrl.org/api/filings?filter[entity.identifier]=<LEI>`. Polish filings there stop at FY2022 |
| **Bankier.pl** | mirrors of ESPI periodic reports with their attachments, for **listed** companies: the annual report's ESEF package (`.zip` or `.xbri`), PDFs, the auditor's report | robots.txt (checked 2026-11-04) blocks only training crawlers (GPTBot, CCBot, Google-Extended, Bard); assistants may read it. A company's filings: `bankier.pl/gielda/notowania/akcje/<SLUG>/komunikaty[/<page>]` (slug e.g. `DEVELIA`, `ARCHICOM`, `BBIDEV`); the annual report is titled "<NAME> Wyniki finansowe SRR <year>" (group) or "RR <year>" (single) since 2026, "<NAME> wyniki finansowe" before (the text says SRR/RR). Attachments are served from `bonnier.pl/static/att/…` (no robots.txt); **files older than about a year answer 404** (on 2026-11-04 every FY2024 attachment was gone). The page also links other companies' attachments: a filing's own files share its number in their names. Bond-only (EBI) issuers aren't listed this way. One request every 2 s. Used 2026-11-04 for Develia, Archicom, BBI, Cavatina, Lokum, Best, Vindexus (FY2025) |
| **money.pl** | mirrors of ESPI filings | robots.txt allows assistants (ChatGPT-User, Perplexity-User) but disallows every `.pdf` for everyone: don't fetch its PDFs |
| **obligacje.pl** | bond terms | robots.txt blocks assistants by name (Claude-User …) and signals `ai-input=no` for all: not for an AI agent |
| biznesradar.pl, stockwatch.pl | summarised financials of listed companies | fallback only (step 6) |

### Downloading by hand from the KRS browser (built: checklist page and `sort-filings`)

- **What's missing** is kept in `scripts/sort-filings/checklist.json` and on the "KRS report checklist"
  page (company, KRS number, year, group or single). Small lenders take their own accounts when they
  file no group ones (`"scope": "any"`).
- **What the browser hands out:** `Dokumenty.zip`, `Dokumenty (1).zip`… each with one document of the
  company's list. Inside, seen so far:
  - KRS XML, plain or **signed**: `….xml.xades` (XAdES) with the statement base64-encoded in a
    `ds:Object` (the signature value and certificates are base64 too: take the block that decodes to a
    statement), or a binary CAdES file with the XML inside as is;
  - roots named by their unit, `JednostkaInnaWTys` / `…WZlotych` (e-sprawozdania app), and since 2025 inside
    a `Dokument` → `TrescDokumentu` envelope with base64 attachments (`Zawartosc`, e.g. the notes as PDF);
    nesting deeper than 100 elements;
  - **signed PDFs** (`…-sig-sig-sig.pdf`) from IFRS filers (art.Locum, Ronson): the KRS number may be
    missing from the text (Ronson); the company is then found by name;
  - **not a statement:** `….xml.cfg.xades`, the accounting program's signed export settings
    (Symfonia's `sage:Config`, Indos FY2025): the statement is another document in the list.
  - The same document downloaded twice (identical files) happens easily.
- **`npm run sort-filings -- <folder> [--copy | --move]`** (free, no stage, Windows paths work) reads every
  file and zip entry, identifies company, KRS, year and scope from the content (PDFs from their text),
  flags failed checks, duplicates, part years, drafts and a wrong year or scope against the checklist, and
  files them as `sorted/<KRS>-<company>/FY<year>-<scope>.<ext>`.
- **For an AI agent on a server:** the person uploads the folder to the dev Filings bucket under `tmp/`
  (`aws s3 sync`), the agent downloads it, imports, and deletes the uploads one by one.

**Rules for any download:**
- respect robots.txt and bot protection;
- rate-limit requests;
- keep each download in its own directory;
- treat files as untrusted data.

### Bond market data and terms (from PortfolioTracker, verified there in October 2026)

| Source | What | Notes |
|---|---|---|
| **Catalyst daily statistics file** (catalyst.gpw.pl, XLS) | every listed bond: ISIN, market, type, **current nominal**, maturity, coupon, accrued interest | what CatalystViewer reads three times a day; the reliable current nominal, IZ included |
| **gpwcatalyst.pl** quotes `notowania-obligacji-obligacje-korporacyjne`, instruments `o-instrumentach-instrumenty-notowane`, interest tables `statystyki-tabele-odsetkowe` | ~280 corporate bonds on one page: reference, last, bid/ask, turnover; every listed bond with its **current nominal and accrued interest** | latest session only, no archive (a missed day is lost). Cells don't line up with headers (bid/ask hold sub-values): read by position. Unreachable from PortfolioTracker's environment since 2026-10-12 (TLS hangs) |
| **BiznesRadar** `biznesradar.pl/notowania-historyczne/<CODE>[,<page>]`, `/notowania/<CODE>` | daily OHLC (clean, % of nominal) and volume of every listed Catalyst bond since listing, 50 sessions a page; the latest quote, 15 minutes delayed | the only working free source of corporate bond **price history**. Lags a day. A redeemed bond answers 404. Personal use: one page every 2 s |
| **gpw.pl archive** `gpw.pl/archiwum-notowan?fetch=1&type=13&instrument=<CODE>` | treasury and state-guaranteed bonds only (DS, IZ, PS, WZ …): full daily history per bond, or one XLS for a day with `date=dd-mm-yyyy`; indices with `type=1` (WIG …) | no corporate bonds. "Cena nominalna" is unreliable for IZ. The server resets connections after a few dozen requests in minutes |
| **obligacje.pl** `/pl/obligacja/<CODE>` | issuer, ISIN, nominal, coupon type, current rate, first days of interest periods, record days, payment days, maturity, issue value | **robots.txt blocks AI assistants: not for an AI agent.** Past floating rates aren't shown; known errors (above); no instalment schedule |
| **Ministry of Finance calculator** `kalkulatorodsetek.xlsm` (gov.pl/web/finanse/kalkulatory2), monthly | CPI reference index `W(n)` since 2003-07; every IZ series (ISIN, dates, BaseRef, coupon); every fixed-rate treasury series | read as data; its VBA macros aren't run |
| **Ministry of Finance index ratios** gov.pl/web/finanse/wspolczynniki-indeksacji2 | daily IZ ratio and accrued interest, current and next month | cross-check |
| **Ministry of Finance retail bonds file** (gov.pl/web/finanse/obligacje-detaliczne1, XLS, monthly) | retail treasury series (EDO, COI, ROD, ROS, TOS, ROR, DOR): rates per year, margin, issue price | not traded on Catalyst |
| **GUS CPI** (stat.gov.pl, "Miesięczne wskaźniki cen … od 1982 roku", CSV, Windows-1250, `;`) | monthly CPI in five bases | published around the 15th; the file name changes, find the link on the page. GUS revises January later; the Ministry keeps the first figure |
| **NBP** `api.nbp.pl/api/exchangerates/rates/a/{code}/{from}/{to}/` | table A history, at most 93 days a request | CatalystViewer uses the current table |
| Bossa EOD files, Stooq | | gone (Bossa's files) or behind a JavaScript challenge (Stooq, 2026): not usable |
| Cbonds (trial), GPW paid history (1,900 PLN per year of data) | Catalyst history | only if the free sources fail |

### Formats

| Format | Who files it | Notes |
|---|---|---|
| **KRS XML** | companies under the Polish accounting act (most unlisted issuers) | fixed line codes from the Ministry of Finance schemas (`JednostkaInna…`, `SkonsolidowanaJednostkaInna…`, also named by unit `…WTys`/`…WZlotych`; schema versions 1-2, 1-3, 2-0E and the 2025 "(2) 1-0E"). In złoty or thousands (from `KodSprawozdania`). Signed (XAdES, CAdES) or not; the 2025 `Dokument` envelope too. Small and micro entities (`JednostkaMala`, `JednostkaMikro`) aren't supported |
| **ESEF package** (`.zip`) | listed companies reporting under IFRS; the consolidated statements are tagged with inline XBRL | prefer the package over the bare `.xhtml`: it carries the filer's calculation tree, anchors and labels, needed for the filer's own debt concepts |
| **IFRS text** (`.xhtml`) | listed companies' separate statements (not tagged) | read by labels; best effort only, not extended further |
| **PDF** | unlisted IFRS reporters (P4, art.Locum, Ronson in the KRS), foreign issuers (Allegro.eu, Pepco, MOL), issuers with only a PDF | read by a model (or by hand), checked in code (step 5). Polish, English or Hungarian. Scanned PDFs (no text layer) aren't supported |

---

## 7. Step 5: reading the reports

### Principle

**Numbers come from documents and are read by code wherever possible. A model may copy lines from a
PDF, but code checks every amount.** The audit of 2026-10-29 found the earlier approach unreliable: a
model retyped about 70 numbers from web pages, with no check. Every figure keeps its sources (the
statement lines or XBRL concepts it came from), its period, its scope (group or single) and its
accounting standard.

### Statement lines (built)

Every line of the three primary statements (balance sheet, income statement, cash flow) is kept per
year:
- the label as printed;
- the value in units of currency;
- the filing's own identifier (KRS line code like `Pasywa_B_III_3_A`, or an XBRL concept like
  `ifrs-full:Inventories`);
- the wider concept an ESEF extension is anchored to;
- the parent subtotal;
- the PDF page;
- a **standard item** from one vocabulary across formats:

```
income:   revenue, costOfSales, grossProfit, ebit, depreciation, interestExpense, financeCosts,
          financeIncome, profitBeforeTax, incomeTax, netProfit, impairment
assets:   totalAssets, noncurrentAssets, propertyPlantEquipment, investmentProperty, intangibleAssets,
          goodwill, loansGranted, currentAssets, inventory, tradeReceivables, cash
equity &  equity, minorityInterests, totalLiabilities, noncurrentLiabilities, currentLiabilities,
liabs:    totalEquityAndLiabilities, debtBankLoans, debtBonds, debtLeases, debtMixed, debtOther,
          tradePayables, contractLiabilities, provisions
cash flow: operatingCashFlow, capex, investingCashFlow, financingCashFlow, interestPaid, dividendsPaid,
          borrowingsRaised, borrowingsRepaid
```

**Item totals:** the sum of a year's lines per item (`items`), counted only from lines in the item's
home statement. A line is skipped when its parent subtotal has the same item, so nothing is counted
twice. Paid amounts are made positive.

**Signs:** in printed formats (PDF, IFRS text) a cost in brackets is negative. In tagged formats (KRS
XML, ESEF) a cost is positive. Treat the size and look at the label.

### Scorecard figures and how each is defined

| Figure | Definition and choices |
|---|---|
| Revenue | sales revenue total. A financial company without one (Kruk): its operating income total |
| EBIT | operating profit. **When the statement prints none** (KGHM, Polenergia): profit before tax + finance costs − finance income, noted on the card; it then includes associates and joint ventures. ESEF: `ProfitLossFromOperatingActivities`, unless the calculation tree sums the operating lines into another line (Orlen FY2024 swapped the tag with the share of associates) |
| Depreciation | depreciation and amortisation of all assets (both intangible lines, right-of-use assets). From the cash flow when the income statement doesn't show it. When the line includes impairment, take the tagged impairment off |
| Interest expense | interest costs; ESEF filers rarely tag them, so total finance costs are used (this overstates interest) |
| Interest paid | cash flow line, positive |
| Net profit | for the period, including minorities |
| Financial debt | interest-bearing debt to third parties: bank loans, bonds, other borrowings, **leases**, bills of exchange. Not trade payables, provisions or other operating liabilities. KRS XML can't separate debt owed to related parties, so it's left out. A line combining loans and bonds ("financial liabilities", P4) counts as debt with no bond split. A balance sheet in order of liquidity (financial companies) takes the debt lines under total liabilities. **Not counted yet: securitisation liabilities** (Vehis Finanse: 437m PLN of debt against 3.2bn of assets), which matters for the finance rules |
| Cash | cash and cash equivalents |
| Current assets / liabilities | totals; when only totals excluding assets held for sale are tagged, add the held-for-sale lines |
| Inventory | for developers this is land, work in progress and finished flats |
| Investment property | separate line, developers |
| Contract liabilities | customer and buyer advances |
| Leases | lease liabilities (part of financial debt) |
| Operating cash flow, capex | cash flow statement; capex as paid, positive |
| Write-downs | income-statement write-downs of non-financial assets (goodwill, PP&E, intangibles). Not receivables, loans or other financial assets, reversals, or subtotals. Found by code from labels and concepts in every format. Added back to EBIT for EBITDA and interest cover, **only when the depreciation figure doesn't already include them** (PGE, Allegro, Pepco and MOL print "depreciation, amortisation and impairment" as one line) |

### Checks (refuse the import when they fail)

- total assets = total equity and liabilities;
- total assets = non-current + current (KRS XML, ESEF);
- net profit in the income statement = net profit in the balance sheet (KRS XML);
- where parents are known, the lines under total assets, and under total equity and liabilities, add up
  to them;
- PDF: every copied amount appears on its page, the balance sheet ties, equity and net profit are
  present. A UK-style balance sheet (net assets, Pepco) is checked as total assets = equity + total
  liabilities;
- IFRS text is accepted only when the balance sheet ties.

### PDF route in detail (built)

1. Code reads the PDF text and finds the statement pages: a statement heading near the top of a page
   that is mostly table lines. Tables of contents are skipped.
2. A model copies every line of the three statements through a fixed-schema tool, without computing
   anything. For each line it gives the label, page, amount per year column exactly as printed, and
   the standard item it belongs to.
3. Code parses the amounts and sums the figures. It decides the number format per report: Polish
   (`1 792,2`) or English (`1,792.2`). Some English-language reports, like Polenergia's, print Polish
   numbers.
4. If a statement comes back empty, the model is asked once more.

Cost and reproducibility:
- About $0.15 per report with Sonnet 4.6.
- The model doesn't answer identically every time, so a re-read whose figures differ is left alone.

**Read by hand instead of a model call (built 2026-11-04):** `import-filing <pdf> --print-prompt <file>`
writes the statement pages and instructions the model would get, with no model call. Whoever reads them
(Claude in a chat did for art.Locum and Ronson FY2024–2025) writes the `record_statements` answer as JSON;
`import-filing <pdf> --transcript <file.json> --transcript-by "<who>"` then runs the same checks and stores it,
with the reader as the extraction's model. Labels stay exactly as printed (repeated labels are fine);
amounts are copied, never computed.

### Company check on import

- KRS XML and IFRS text carry the KRS number.
- ESEF carries the LEI; the KRS number comes from GLEIF.
- A PDF's KRS number whose registered name differs from the report's company is refused: it's
  probably a subsidiary's, from the list of group companies.
- A foreign issuer is stored under `LEI:<lei>`.

### Quality control (built)

A known-answers set (`scripts/check-filings/expected.json`) covers 40 reports. Its figures were read
by hand from the printed statements and are compared with the stored rows and with a fresh parse. Run
it after any parser or prompt change. Each new report gets its hand-read figures added.

---

## 8. Step 6: figures when there is no report

The app's first approach, kept as a fallback for issuers without an imported report:

- **How:** an AI agent with web search, biznesradar.pl and stockwatch.pl tools collects up to 5 full
  years of figures (in PLN millions) and fills nulls where it found nothing.
- **When:** the filed report wins whenever its latest year is at least as recent as the agent's.
- **What it can't do:** confidence is **medium at best**, since nothing is checked against a document.

Known failure modes, which any agent doing this must avoid:

- **Part-year figures labelled as a full year.** Skip the current year and any year with fewer than
  four quarters.
- **Not knowing today's date.** Pass the date: a model once skipped a complete 2025 in October 2026.
- **Units.** The tools return PLN thousands. Ratios don't depend on units, but a mix of units within a
  year does break them.
- **Taking the first search hit for the company.** Check that it is the company from step 2.
- **No figure is better than a guessed one:** n/a shows as n/a, and data confidence drops.

The planned direction: an issuer without a report gets one imported, rather than a better agent. The
model's job is extraction from documents with quotes (section 15).

---

## 9. Step 7: the scorecard

### Definitions

- **Net debt** = financial debt − cash (leases included).
- **EBITDA** = EBIT before write-downs + depreciation.
- **ICR** (interest cover) = EBIT before write-downs / interest expense.
- The **latest full year** gives dimensions 1–5; dimension 6 uses up to 5 years.

### Signal rules

- A metric is **green** above (or below) the green threshold and **yellow** up to the yellow threshold
  inclusive, else **red**. Without its inputs it is **n/a**, never a colour.
- **Negative equity** makes D/E red. **EBITDA ≤ 0** makes net debt / EBITDA red.
- A dimension takes the **worst** of its scored metrics, ignoring n/a. It is n/a when all are n/a.
- Metrics marked **"shown, not scored"** are context only and don't count.
- **Trend:** n/a with fewer than 3 years or no computable metric; red when 2 or more metrics are red;
  green when all computable ones are green and there are at least 2; yellow otherwise.
- **Quick ratio: removed** for every rule set. It was red for 12 of 27 issuers, including KGHM, whose
  inventory is copper.

### Thresholds by rule set

Green / yellow thresholds. For "lower is better" metrics, green is below the first value and yellow up
to the second. For "higher is better" metrics, green is above the first and yellow from the second.

| Dimension | General | Developer | Contractor | Consumer and services |
|---|---|---|---|---|
| **1 Debt Burden** | D/E < 1.0 / ≤ 2.0 · Net debt / EBITDA < 2.5 / ≤ 4.0 | Net debt / (inventory + investment property) < 0.3 / ≤ 0.6 · Net debt / equity < 0.5 / ≤ 1.0 | as General | Net debt incl. leases / EBITDA < 3.0 / ≤ 4.5 · Net debt excl. leases / EBITDA shown · Free cash flow (OCF − capex) / net debt > 15% / ≥ 5%, net cash = green |
| **2 Debt Service** | ICR > 3.0 / ≥ 1.5 | EBIT / **interest paid** (cash flow) when known, else / interest expense: > 3.0 / ≥ 1.5 | as General | as General |
| **3 Liquidity** | Current ratio > 1.5 / ≥ 1.0 | Current ratio > 2.0 / ≥ 1.3 · Buyer advances / inventory shown | Current ratio > 1.2 / ≥ 1.0 · (Cash − contract liabilities) / revenue > 5% / ≥ 0 | OCF / current liabilities > 0.5 / ≥ 0.3 · Current ratio shown |
| **4 Profitability** | EBIT margin > 10% / ≥ 5% · Net margin > 5% / ≥ 1% | EBIT > 15% / ≥ 8% · Net > 10% / ≥ 5% | EBIT > 4% / ≥ 2% · Net > 2.5% / ≥ 0.5% | as General |
| **5 Asset Coverage** | Asset coverage ratio > 1.5 / ≥ 1.0 · Equity ratio > 30% / ≥ 15% | ACR as General · Equity ratio > 35% / ≥ 25% | as General | ACR shown · Equity ratio > 20% / ≥ 10% |
| **6 Financial Trend** | Revenue CAGR > 5% / ≥ 0 · EBITDA margin slope > 0, or flat (within ±0.005) above 10% = green, ≥ −0.005 = yellow · Net debt / EBITDA slope < −0.1 / ≤ 0.1 | same | same | same |
| **7 Refinancing** | step 8 | same | same | same |

Asset coverage ratio = (total assets − intangibles − current liabilities) / financial debt. Equity
ratio = equity / total assets.

### Why each rule set differs

- **Developers:**
  - Flats and land are inventory, so the quick ratio was always red.
  - Revenue is booked on handover, so EBITDA swings from year to year (Echo 13×).
  - Interest is capitalised into inventory, so income-statement interest flatters: use interest paid.
  - Judge debt against the stock it finances.
- **Contractors:**
  - Margins of 2–5% are normal.
  - Their cash is largely customers' advances, which aren't theirs to spend: count cash net of advances.
- **Consumer and services:**
  - Suppliers finance the stock and customers pay upfront, so current liabilities exceed current assets
    by design. Judge liquidity by operating cash flow.
  - Shop, mast and gym leases are debt under IFRS 16. Judge debt including leases, and show it
    excluding them.
- **Write-downs** (all sets): a non-cash one-off (Cyfrowy Polsat's 2,717m PLN goodwill write-down in
  2025) shouldn't decide debt service. EBITDA and ICR are measured before it, and the card says so. The
  net margin keeps it, because the loss was real.

The thresholds are starting values from common credit practice (CFA, S&P criteria, leveraged finance
convention) adjusted per sector. They are **not calibrated** on Catalyst defaults yet (section 15).

---

## 10. Step 8: refinancing

The bondholder's main near-term question: can the issuer pay the bonds due soon from cash and the cash
its business makes, or does it depend on refinancing? **Built**, for every issuer with a report.

- **Schedule:**
  - the company's active listed bonds, under all its names, plus a group's financing vehicle, since the
    group's cash covers them all;
  - one per ISIN; matured bonds excluded;
  - amount as issued, by maturity date.
- **Currency:**
  - converted to the report's currency at the NBP mid rate, table A
    (`https://api.nbp.pl/api/exchangerates/tables/a/`), cached for a day;
  - a bond without a rate is shown but left out of the totals, with a note.
- **Windows:** 12 and 24 months from **today**. The cash is from the report date. Say both.
- **Covers:**
  - cash cover 12m = cash / bonds due in 12 months;
  - liquidity cover 24m = (cash + 2 × operating cash flow) / bonds due in 24 months. A negative
    operating cash flow counts as negative (a developer buying land, a company burning cash).
- **Signal**, from the weaker cover:
  - green ≥ 1.5×, or nothing due within 24 months;
  - yellow ≥ 0.75×;
  - red below that;
  - n/a without a cash figure.
  - Without an operating cash flow, cash alone is set against 24 months, with a note.
- **Notes the card shows:**
  - the cash report date;
  - "listed bonds only, as issued: loans, unlisted bonds and early redemptions are not included";
  - listed bonds vs the balance sheet's bond line when they differ by more than 5%. Cyfrowy Polsat lists
    2,670m PLN against 4,020m in its balance sheet: not all its bonds are on Catalyst.

Bonds repaid in instalments are counted at the amount still owed (step 1, "A bond's nominal value can
change"). Since the dates of later instalments aren't in any data the app has, the whole remainder is
counted at maturity, and the card names those bonds.

Not included yet: bank loans due, undrawn credit lines, developers' escrow accounts, the dates of later
instalments, new tranches and buy-backs after the bond was first seen (section 15).

---

## 11. Step 9: data confidence

How much the colours rest on. **Built.**

- **Source:** imported report (format, scope) or AI-collected figures.
- **Years behind:** later fiscal years whose report is due (9 months after year end) but not used.
- **Metrics computed** of those scored in the five snapshot dimensions, and the names of the missing
  ones. Trend (needs years) and Refinancing (needs bonds) aren't counted.
- **Thin dimension:** coloured by one metric where it has two or more.
- **Level:**
  - **low:** under 50% of metrics, or 2 or more snapshot dimensions n/a, or 2 or more years behind;
  - **high:** an imported report, at least 80% of metrics, not behind;
  - **medium:** the rest. AI-collected figures are never high.

A low-confidence card is shown faded. **A card built on one figure must never read like a full one.**

---

## 12. Step 10: the judgement

The scorecard is the start, not the verdict. Write a short judgement (a few sentences, with figures and
their year) from these principles.

### Reading the scorecard

- **Debt service is the single most important dimension for a bondholder.** An ICR below 1.5× is a
  serious warning whatever else is green. Below 1.0×, operating profit doesn't pay the interest; the
  issuer is borrowing or using reserves to pay it.
- **Refinancing is the nearest risk.** A red here with bonds due in months matters more than a
  three-year trend. Ask where the money comes from: cash, operating cash flow, asset sales, new bonds.
  Catalyst issuers often refinance by issuing new bonds, so a weak issuer depends on the market staying
  open.
- **The trend can override the snapshot.** A borderline yellow year at the end of a three-year slide is
  worse than the same year after a recovery.
- **Read the reds against the rule set.** A developer's low current ratio, a shop's negative working
  capital and a contractor's thin margin are normal for them; the rule sets handle the known cases,
  but check the business model (the AB case).
- **Separate one-offs from the trend:** write-downs (measured before), disposals, acquisitions that
  lift leverage for a year. Read the notes before calling a red structural.
- **Seasonality:** a year-end balance sheet may catch a seasonal low (developers before handovers,
  retailers after Christmas).
- **Group vs single:** a holding's own accounts can look clean while the debt sits in subsidiaries,
  and the reverse. Use group accounts, and note structural subordination.

### Red flags outside the metrics

Look for these in the report, the auditor's report and current reports. Any of them can outweigh good
ratios.

- **The auditor's opinion:** a qualified opinion, a disclaimer, an **emphasis of matter on going
  concern** (*istotna niepewność dotycząca kontynuacji działalności*), or a change of auditor.
- **A late or missing annual report.** A report not filed when due is a warning in itself. Missing or
  restated data is a signal.
- **Covenant breaches,** waivers, and debt reclassified to current because of a breach.
- **Bond terms:** collateral and security, guarantees (a financing vehicle's guarantor), ranking,
  cross-default clauses, and whether the bonds are secured on assets or unsecured.
- **Pledges and owners' debt:** the issuer's shares pledged for its owner's bonds (Ronson: all shares, for
  Luzon Ronson N.V.'s bonds) tie the issuer to its parent's finances.
- **Related-party transactions:** loans to owners, sales to related companies, receivables from
  related parties (KRS XML can't separate related-party debt).
- **Defaults and restructurings:** missed coupons, extended maturities, bond buy-backs below par,
  restructuring proceedings, Catalyst suspensions. These are in ESPI/EBI current reports.
- **Market signals** the app has: a price falling well below par, a widening spread, collapsing
  liquidity. Not proof, but a reason to look (planned: mismatch alerts).
- **A bond's price history** shows when the market started to doubt the issuer. BiznesRadar's
  history pages cover every listed corporate bond from its listing (section 6, "Bond market data").
- A bond that stops trading or disappears from the quote pages (BiznesRadar answers 404 for a redeemed or
  delisted bond) before its maturity needs an explanation.

### Benchmarks to compare with (planned)

- Polish bankruptcy-prediction models (Mączyńska, Hołda, Gajdka–Stos) as a cross-check.
- Past Catalyst defaults, GetBack 2018 first, to calibrate the thresholds.

---

## 13. Presenting the result

**Built** in the app:

- **Issuer card:**
  - a row of 7 dots in the header;
  - expanded, a grid of dimensions with a tooltip per dimension: its metrics with values and colours,
    "not scored" metrics in grey, and notes (write-downs, derived EBIT, refinancing caveats, "coloured
    by one of its metrics");
  - a title line naming the rule set and the confidence, e.g. "Fundamental Analysis · developer rules ·
    High confidence", with the confidence facts in a tooltip;
  - low confidence fades the dots.
- **Source line:** "Figures from the annual report (ESEF, IFRS), group accounts, fiscal year ending
  2025-12-31 and 1 earlier", or that the figures are AI-collected.
- **Registration line:** country, KRS or local register number, LEI, "LEI lapsed".
- **Financials view:**
  - up to six years of figures, with the source per year, a link to the original document, and the
    statement lines behind each figure;
  - years where AI-collected and filed figures differ by more than 2% are marked;
  - *Full statements*: a year's lines as printed;
  - *Bond maturities*: year by year, the amount due per currency and the bonds, against cash and
    operating cash flow.

**An analysis written by an agent** (e.g. in chat, or the app's planned narrative) should follow this
layout:

```
<Company> (<legal name>, <country>, KRS <…> / LEI <…>) — <industry>, <rule set> rules
Bonds: <n> listed, <amount> due in 12 months, <amount> in 24 months; this bond <name>: <amount>, matures <date>, <coupon>
Figures: <source>, <scope> accounts, FY<year> (+<n> earlier) — confidence <level> (<facts>)

| Dimension | Signal | Metrics (value, colour) |
… 7 rows …

Judgement: 2–5 sentences. The reds that matter and why; what offsets them; refinancing.
Red flags: auditor, late filing, covenants, related parties, defaults — with source and quote, or "none found in <documents read>".
Watch: what would change the view (next report date, a maturity, a covenant).
Sources: each document with year and link.
```

- Give every number with its year and unit.
- Never present a figure that wasn't found in a document as if it were.
- Say what wasn't checked.

---

## 14. Known issuers and exceptions

Lessons from imports so far. Check here before treating a strange result as the company's problem.

| Issuer | Case | Handling |
|---|---|---|
| Orlen S.A. / PKN Orlen S.A. | two bond names, one company (old name) | one identity, one card. FY2024 ESEF swapped the operating profit tag with the share of associates; EBIT is taken from the calculation tree |
| Best S.A. / Kredyt Inkaso | Kredyt Inkaso merged into Best (KRS, 1 April 2025); Best took over its bonds | one company |
| Best funds | Best Capital FIZAN and the others merged into Best Niestandaryzowany FIZ Wierzytelności (30 January 2025) | one LEI, confirmed |
| Pepco | bonds issued by PEU (FIN) PLC, guaranteed by Pepco Group N.V.; fiscal year ends 30 September; English PDF; UK-style balance sheet | group's figures, under its LEI |
| Gmina Słupsk / Redzikowo, Santander / Erste | renames | one company |
| AB S.A. | IT distributor classified Retail; fiscal year ends 30 September | general rules override |
| KGHM | no operating profit line; EBIT derived includes 2.9bn PLN from the Sierra Gorda joint venture; two intangible lines; site only has a PDF | derived EBIT with a note; both intangible lines count |
| Polenergia | no operating profit line; English report with Polish number format | derived EBIT; per-report number format |
| Cyfrowy Polsat | depreciation line includes impairment, and a 2,717m PLN goodwill write-down; only part of its bonds is on Catalyst | impairment taken off depreciation and added back to EBIT; note listed vs balance sheet bonds |
| PGE, Allegro, Pepco, MOL | depreciation line includes impairment | write-downs not added back a second time |
| P4 | one "financial liabilities" line for loans and bonds | debt with no bond split |
| Kruk | financial company: no revenue total, balance sheet in order of liquidity; Finance, out of scope | operating income total as revenue; debt lines under total liabilities |
| Cognor | several amortisation lines | all count |
| Dekpol | consolidated statements only as a .7z archive | unpacked by hand |
| Erbud | bare ESEF report, no package | filer debt lines by name |
| MOL | Hungarian PDF, foreign issuer | Hungarian headings; under its LEI |
| Allegro.eu, Żabka Group | registered in Luxembourg | under the LEI |
| Echo Investment | developer with investment property; EUR bonds | developer rules count investment property in the stock; NBP rates for the EUR bonds |
| WB Electronics | no LEI | no identity |
| Ronson Development SE | its KRS file is a signed PDF named "…_draft.pdf" (the text is the final PwC-audited version; slips in the changes in equity); no KRS line in the text; land held for development shown as non-current; all shares pledged for the parent's bonds | read by hand; KRS passed with `--krs`; the land counts as inventory |
| art.Locum S.A. | IFRS group statements as signed PDFs in the KRS, in złoty | read by hand |
| Vehis Finanse | KRS XML in thousands under `JednostkaInnaWTys`, FY2025 in the 2025 envelope with a 1.4 MB attachment; funded by securitisation (not in debt); FY2024 revenue 118.1m in its own report, 78.8m as restated in FY2025's | parsed; the FY2024 report's own figures are kept for FY2024 |
| Indos | the KRS list holds only a signed Symfonia settings file (`.xml.cfg.xades`) for FY2025, not the statement; the annual report is on indos.pl, but under `/api/`, which its robots.txt disallows. The FY2025 report restates 2024: net profit −19k PLN instead of the 3.93m first reported (a 3.95m charge, receivables lower by the same) | FY2025 PDF downloaded by the owner, read by hand; FY2024 keeps the figures of its own (original) report |
| Vindexus FY2024 | the KRS entry for the group report holds the untagged single-company statement (pdf2htmlEX); the group ESEF package is in `Raport_roczny_2024.zip` on gpm-vindexus.pl (investor relations → reports), which tags the bonds as bonds (debt 114.6m PLN; the FY2025 report's tagging gives 2.4m for the same year) | imported from the company's site |
| P4, Cognor FY2024 | IFRS statements as PDFs in the KRS | read by hand (FY2023 column of P4 is restated) |
| MOL FY2024 | `ifrs-consolidated-fs-eng-esef.pdf` on molgroup.info is the auditor's report only; the ESEF zip isn't linked at a fixed address. The statements are in the integrated annual report (pages 51–55, HUF million, costs printed as positive amounts) | read by hand from the integrated report |
| Pepco FY2024 | the original FY2024 report (ESEF on filings.xbrl.org under LEI 213800OVMJPFP79OB449) includes Poundland, sold since; the FY2025 report restates FY2024 without it (revenue 4,160 vs 6,167m EUR, EBIT 323 vs −445). That package also leaves right-of-use depreciation (365m EUR) untagged for the parser | not imported, by the owner's choice (2026-11-05): keep the most recent, comparable figures; Pepco stays on two years until its FY2026 report |
| Allegro.eu, Żabka FY2024 | ESEF packages inside the companies' reporting packages (`Q4-2024-Reporting-package-…zip` on about.allegro.eu, `Annual-Reporting-Package-2024-Zabka-Group.zip` on zabkagroup.com) | imported |
| BBI Development | a developer working through joint ventures: 174m PLN of equity-accounted investments, 3.4m of inventory, so net debt / stock reads 21× | the developer rule doesn't fit; needs a holding-company view (section 15) |
| Vindexus | debt collector whose bonds sit in "other financial liabilities" (72.4m + 28.2m PLN) next to separate loan lines, so they're left out of debt (2.2m) | fix with the finance rules |
| Grupa Corpus Iuris, Internetowy Fundusz Leasingowy | debt collector (net profit above revenue: portfolio gains aren't revenue), leasing (single company, no group) | stored for the finance rules |
| Kruk KRU0228, Resi Capital RES0228 | instalment redemptions: nominal 1,000 → 550 and → 709.27 | amount owed from the current nominal; the remainder counted at maturity |
| IZ0831, IZ0836 (State Treasury) | inflation-indexed nominal | current nominal from the Catalyst file; formula in step 1 |

Results on 2026-11-04, prod: 34 issuers scored from reports (added that day: art.Locum and Ronson from the
KRS, Develia, Archicom, BBI, Cavatina and Lokum from Bankier's ESEF packages), 11 from AI-collected figures,
29 in scope with no scorecard yet; Finance issuers with reports stored for the coming finance rules: Kruk,
Best, Vindexus, Corpus Iuris, Vehis, IFL, Indos, MCI Management, AOW Faktoring. After the KRS FY2024 reports
(4–5 November), 30 of the 34 have 3 or more years, so their trend is computed; by 5 November all but Pepco
(Allegro.eu, Żabka and MOL FY2024 fetched from their own sites; Pepco's FY2024 left out, see the table above). Trend red: Atal, Archicom, Benefit Systems, Cavatina, Cognor,
Echo, Lokum, Marvipol, PCC Exol, PCC Rokita, Polenergia. Refinancing is red for Atal (130m PLN due in 12 months, 146m cash,
operating cash flow −657m) and yellow for Echo.

---

## 15. Not covered yet

In the order the roadmap would take them:

1. **Finance rules** for non-bank lenders:
   - Subcategories first.
   - Then equity / assets, debt / equity, interest cover, return on equity, and bonds as a share of
     debt.
   - For debt collectors: cash collections, cash EBITDA, net debt / cash EBITDA, and portfolio
     purchases vs collections.
   - Needs their reports imported (only Kruk so far).
2. **More reports:**
   PragmaGO's FY2025 PDF (collected, not imported); the 29
   in-scope issuers with no scorecard yet; FY2025 reports for the 11 scored from AI-collected figures.
3. **From the notes, by a model with quotes checked in code:**
   - the debt maturity schedule, including loans;
   - covenants, collateral, guarantees and ranking;
   - the auditor's opinion;
   - related-party transactions, large one-offs and late filing;
   - a short narrative with citations.
   The final answer goes through a fixed-schema tool, and every quoted number must appear in the
   source.
4. **Developers:** escrow accounts and pre-sales from the notes, land bank. **Contractors:** order
   backlog.
5. **Undrawn credit lines** and bank loans due, in Refinancing.
6. **Instalment dates and amounts in circulation:**
    - the current nominal and the amount owed are built (2026-11-04);
    - left: the dates of later instalments (from the terms of issue), and re-reading the amount in
      circulation for new tranches and buy-backs.
7. **Trailing 12 months** from half-year and quarterly reports, instead of the last full year.
8. **Calibration** of the thresholds on past Catalyst defaults (GetBack 2018 and others), compared with
   Polish bankruptcy models. The sample is small, so this is calibration, not machine learning.
9. **Holding-company flag** (structural subordination), and a holding view for developers working through
   joint ventures (BBI Development).
10. **With market data:**
   - a risk vs yield chart;
   - mismatch alerts (price drop with no fundamental news);
   - risk band filters, an issuer page, peer ranking.
11. **Monitoring:** re-run on new reports; alerts (late report, auditor change, covenant breach, a
    dimension changing colour); a watchlist from holdings.

---

## 16. Where things are

| What | Where |
|---|---|
| Scorecard rules, rule sets, overrides | `packages/core/src/bonds/fundamentals/scorecard.ts` |
| Scope (Finance, Municipal out) | `packages/core/src/bonds/fundamentals/scope.ts` |
| Refinancing | `packages/core/src/bonds/fundamentals/maturities.ts`, NBP rates `packages/core/src/bonds/fx/nbp.ts` |
| Data confidence | `packages/core/src/bonds/fundamentals/confidence.ts` |
| Report parsers | `packages/core/src/bonds/fundamentals/filings/`: `FilingParser.ts` (KRS XML), `EsefParser.ts`, `IfrsTextParser.ts`, `AiPdfExtractor.ts` |
| Statement lines, items, write-downs | `filings/statementLines.ts`; years for the scorecard `filings/filedYears.ts` |
| Identity | `packages/core/src/bonds/issuers/identity.ts`, `scripts/resolve-issuers/` |
| Classification and AI analysis | `packages/core/src/ai/issuers/IssuerClassification.ts`, `IssuerAnalysis.ts` |
| Assembling a profile (scorecard, refinancing, confidence) | `packages/functions/src/issuers/getIssuerProfiles.ts` |
| Import and checks | `scripts/import-filing/`, `scripts/check-filings/` (known answers), `scripts/reparse-filings/`, `scripts/item-totals/` |
| How to import, commands | `docs/development.md`, "Importing filed statements" |
| Design records | `docs/superpowers/specs/`: `2026-05-11-fundamental-analysis-design.md` (v1 framework), `2026-10-29-fundamental-analysis-v2-roadmap.md` (audit, roadmap, progress), `2026-11-02-statement-lines-design.md`, `2026-11-03-issuer-identity-design.md`, `2026-11-03-bond-maturities-vs-cash-design.md`, `2026-11-03-sector-rules-design.md`, `2026-11-03-data-confidence-design.md` |

### Keeping this document current

Update it with every change to the rules, sources, or a new exception. It is the single description an
agent starts from. The design records stay as the history of why.
