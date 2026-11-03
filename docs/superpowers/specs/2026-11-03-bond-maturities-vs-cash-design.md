# Bond maturities vs cash: design

Roadmap phase 2, first item ("Upcoming bond maturities vs cash", section 3). Status: proposal, 2026-11-03.

## Why

A bondholder's main question is whether the issuer can pay back the bonds due soon: from cash, from
the cash its business makes, or by refinancing. The app has both halves. `BondDetails` holds every listed
bond with its amount and maturity date, and the imported reports hold cash and operating cash flow.
Issuer identities now join the two by company. The current scorecard has nothing on maturities.

## What the data gives (prod, 2026-11-03, read only)

The 27 issuers with imported reports:

- **Bonds per issuer:** 0 to 20 active listed bonds. One bond can be listed on two markets (GPW and
  BondSpot), so each ISIN is counted once.
- **Amount:** `issueValue` is the amount issued. Where the balance sheet has its own bond line, the
  two mostly agree (KGHM 2,600 vs 2,604 m PLN, Polenergia 750 vs 761, PCC Exol 45 vs 45). Some are
  lower than the balance sheet because some bonds aren't listed on Catalyst (Cyfrowy Polsat 2,670 vs
  4,020, Kruk 3,030 PLN vs 3,461).
- **Currency:** 79 of the 1,044 active bonds are in EUR (Kruk, Echo, Orlen). Pepco reports in EUR and MOL
  in HUF, but both have PLN bonds.
- **Something due within 24 months:** 11 of the 27. Examples:

| Issuer | Report | Due 12 m | Due 24 m | Cash | Operating cash flow |
|---|---|---|---|---|---|
| Atal | FY2025 | 130 | 430 | 146 | −657 |
| Kruk | FY2025 | 540 + EUR | 1,180 + EUR | 213 | 293 |
| Murapol | FY2025 | 150 | 250 | 278 | 311 |
| Echo Investment | FY2025 | 50 | 550 + EUR | 377 | 271 |
| Enea | FY2025 | 1,000 | 1,000 | 4,525 | 7,841 |
| AB | FY 09/2025 | 80 | 80 | 135 | 108 |

(m PLN, bonds issued, measured from today.)

## What it computes

For each issuer whose figures come from an imported report (the identity's `financialsEntityId`):

- **Schedule:** its active listed bonds (all the names of the company), one per ISIN, as amount and
  currency by maturity date. The 12- and 24-month windows are counted from today.
- **Currency:** amounts are converted to the report's currency at the NBP mid rate (table A, open API).
  The rate is cached for a day. If the rate can't be fetched, the bond is shown but left out of the
  ratios, with a note.
- **Ratios:**
  - *cash cover 12 m* = cash ÷ bonds due in 12 months;
  - *liquidity cover 24 m* = (cash + 2 × operating cash flow) ÷ bonds due in 24 months. A negative
    operating cash flow counts as negative: a developer buying land, or a company burning cash.
- **Signal** (a new scorecard dimension, **Refinancing**), from the weaker of the two:
  - green: ≥ 1.5×, or nothing due within 24 months;
  - yellow: 0.75–1.5×;
  - red: < 0.75×;
  - n/a: no cash figure.
- **Notes the card shows:**
  - the report date ("cash at 31 Dec 2025": the cash is from the report, the bonds due are from today);
  - "listed bonds only": loans and unlisted bonds aren't in it. Where the balance sheet has a bond
    line, it shows "listed: 2,670 of 4,020 in the balance sheet";
  - "amounts issued": an early or partial redemption isn't known.

Finance and Municipal issuers get the schedule but no signal, like the rest of the scorecard. Issuers
without an imported report get the schedule alone. Without a cash figure the ratios mean nothing.

## Where it shows

- **Issuer card:** a seventh dot, Refinancing, next to the six dimensions. Its tooltip gives the
  amounts due, the two covers and the notes.
- **Financials view:** a "Bond maturities" table: year by year, the amount due per currency and the
  bonds, against cash and operating cash flow from the latest report.

## How it's built

- Core: `bonds/fundamentals/maturities.ts`, a pure function (bonds, latest year's figures, today, rates)
  → schedule, covers, signal, notes. Tested on the issuers above.
- An NBP rate client (`bonds/fx/nbp.ts`), cached in the Lambda, with a test on a recorded answer.
- API: `getIssuerProfiles` already reads active bonds and financials. It adds `refinancing` to each
  profile, computed at read time like the scorecard, so nothing is stored and rule changes apply at once.
  `getIssuerFinancials` adds the schedule.
- Web: the dimension in `IssuerScorecard`, the table in the Financials view.

No new resources, no data written, no AI calls. The only new outside call is the NBP rate, at most once
a day per Lambda instance.

## Not now

- Loans and other debt due (the balance sheet's current debt lines, or the notes' maturity table):
  phase 2's "debt maturity schedule" from the notes.
- Undrawn credit lines, developers' escrow accounts: with the developer and finance rules.
- Amount outstanding after redemptions: GPW doesn't publish it per bond in the data we read.
