# Issuer identity: design

Roadmap phase 1b, item 4. Status: approved 2026-11-03; built (steps 1, 3–5), prod run in step 2.

## Why

The app knows an issuer only by the name on its bonds (from obligacje.pl). Every distinct name gets
a profile, and imported reports are joined to issuers by name. That breaks in three ways:

- **One company, several names.** Orlen's bonds are listed as "Orlen S.A." (3) and "PKN Orlen S.A."
  (2, its old name): two issuer cards, and only one has the imported reports. Likewise Santander Bank
  Polska (now Erste Bank Polska), Kredyt Inkaso (merged into Best), Gmina Słupsk (now Gmina Redzikowo).
- **Financing vehicles.** Pepco's bonds are legally issued by PEU (FIN) PLC (UK) and Orlen's euro bonds
  by Orlen Capital AB (Sweden); the accounts that matter are the group's.
- **Imports match by name**, and need `--issuer` whenever a filing's company name differs from the
  bond name.

Phase 2 compares a company's cash with its bonds' maturities, so bonds and reports must be joined
by company, not by name.

## The source: the LEI register

Every issuer of securities admitted to trading needs an LEI, and GLEIF publishes the register as open
data (CC0) with an API. Two ways in, tested on the 208 issuer names of the bonds in prod:

| Route | Resolved | How |
|---|---|---|
| ISIN → LEI (GLEIF's ISIN mapping) | 162 | `lei-records?filter[isin]=<isin>`, up to 3 ISINs per name |
| Name search, exact match only | 30 | `filter[fulltext]=<name without legal form>`; accepted only when exactly one result has the same name as the issuer once legal forms are removed |
| Left for a manual entry | 16 | Pekao, Bałtycki BS w Darłowie, CCC, GPM Vindexus, 3 gminy and 2 miasta, Grenevia (formerly Famur), HB Reavis, LPP, MCI Capital, PKN Orlen (Orlen's old name), Pekabex, i2 Development (only a retired LEI of another legal form) |

The LEI record gives the legal name, country (jurisdiction), the local register and number (for Polish
companies the KRS: registration authority RA000484), the category (general, fund, government entity),
whether the LEI is current (`ISSUED`) or `LAPSED`, and the parent companies.

An ISIN match isn't always the name on the bond: 26 of the 162 have a legal name that differs. Most are
the same body in another form ("Miasto Łódź" = "ŁÓDŹ-MIASTO NA PRAWACH POWIATU", "European Investment
Bank"), some are renames or mergers (Santander → Erste, Kredyt Inkaso → Best), one is a financing
vehicle (Pepco → PEU (FIN) PLC), and one may be wrong (two Best funds on one LEI). So a match whose
names disagree is stored for review, not as confirmed.

## What is stored

One `#IDENTITY` row per issuer name in the `IssuerProfiles` table, next to its `#PROFILE` and analysis
rows (the table's single-table design; no new resource):

```ts
type DbIssuerIdentityRecord = {
    issuerName: string;            // PK: the name on the bonds
    recordType: '#IDENTITY';       // SK
    entityId: string;              // the company: KRS number for a Polish company, else "LEI:<lei>" (as in IssuerFinancials)
    lei?: string;
    krs?: string;
    legalName: string;             // from the LEI register (or the KRS)
    country: string;               // ISO 3166
    register?: { authority: string; id: string };   // e.g. RA000484 / 0000028860
    category?: string;             // GENERAL, FUND, RESIDENT_GOVERNMENT_ENTITY, …
    leiStatus?: 'ISSUED' | 'LAPSED' | 'RETIRED' | string;
    financialsEntityId: string;    // whose reports the scorecard uses: entityId, or the group/guarantor for a financing vehicle
    status: 'confirmed' | 'review';
    source: 'isin' | 'name' | 'manual';
    evidence: string;              // e.g. "ISIN PLPKN0000257", "name match", "set by hand"
    resolvedAt: string;
};
```

- **Same company:** names whose rows share an `entityId` are one company.
- **Financing vehicle:** `financialsEntityId` points at the group. It is set by hand; the resolver
  suggests the LEI record's direct parent.
- **Review:** a `review` row is used like a confirmed one but flagged in the report; confirming it is
  one command.

## How it is used

- **Issuer cards:** names of one company show as one card, titled by the name that matches the
  current legal name, with "also issued as PKN Orlen S.A." and all their bonds; the issuer filter
  selects the company. A financing vehicle keeps its own card, with the group's scorecard and a note
  ("figures: Orlen S.A. group, parent").
- **Scorecard and Financials view:** reports are found by `financialsEntityId` (the table is keyed by
  entity already), not by name; names without an identity keep matching by name.
- **Registration line** on every card (country, register number, LEI, "LEI lapsed" when it is), not
  only on issuers with imported reports.
- **Import:** the filing's KRS or LEI finds the issuer through the identities; `--issuer` is needed only
  for a company without one. "One issuer, one company" is checked against the identity.

## Filling and keeping it

- `npm run resolve-issuers` (inside `sst shell`): for each issuer name without an identity, ISINs, then
  the name search; dry run by default, `--write` to store. Prints what it found per name, the
  `review` ones with the reason, and the unresolved.
- `--set "<name>" --lei <lei>` (or `--krs`), `--financials-from <entity>`, `--confirm "<name>"` for the
  manual cases.
- GLEIF requests at about one per second (its limit is 60 a minute); a full run is ~250 requests, ~5
  minutes.
- New issuers appear when the Bonds Updater finds new bonds: its `ResolveIssuerIdentity` step runs
  after each classification (added 2026-11-03, with the owner's yes), with its own catch so a GLEIF
  failure doesn't fail the classification; the report email shows the result.

## Data in prod

About 208 new rows in `IssuerProfiles`; nothing existing is changed or deleted. The "PKN Orlen S.A."
profile stays (its classification), its card merges into Orlen's. Undo: delete the `#IDENTITY` rows.

## Steps

1. Types, table methods, the resolver (GLEIF client, name rules, merge detection) with tests on
   recorded GLEIF answers.
2. `resolve-issuers`: dev, then prod; the manual cases with you.
3. API: identity in the issuer list, reports joined by entity.
4. Web: merged cards, registration line for every issuer.
5. Import resolves the issuer through identities.

## Decided (2026-11-03, from the companies' filings)

- Kredyt Inkaso merged into Best S.A. (takeover, registered in the KRS on 1 April 2025; Best took over its
  bonds): one company, confirmed.
- Best Capital FIZAN and the other Best funds merged into Best Niestandaryzowany FIZ Wierzytelności
  (RFI 1753, registered 30 January 2025), which took over their bonds: one LEI is right, confirmed.
- Pepco: PEU (FIN) PLC is a wholly owned financing subsidiary of Pepco Group N.V., which guarantees its
  Polish bonds: the group's figures, confirmed. (Orlen Capital AB has no bonds in the app.)
