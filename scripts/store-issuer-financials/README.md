# store-issuer-financials

One-off script that ingests issuer financial data (annual P&L and balance sheet
figures) into the `IssuerFinancials` DynamoDB table.

## Setup

1. Open `store-issuer-financials.ts` and fill in the `Configuration` section at the top:
   - `TABLE_NAME` — find it in the AWS console or SST deployment output
   - `JSON_FILE_PATH` — path to your financials JSON file
2. Install dependencies:

```bash
npm install
```

## Run

```bash
# Dry run first — reports what would change, no writes (default)
npm run store

# Live run — stores records into DynamoDB
npm run store:live
```

AWS credentials must be available in the environment (`AWS_PROFILE` or env vars).

## Input format

The JSON file must be an array of records. All monetary values in the same unit
(e.g. PLN thousands). All fields except `issuerName` and `year` are optional.

```json
[
  {
    "issuerName": "Acme S.A.",
    "year": 2024,
    "revenue": 48200,
    "ebit": 5100,
    "depreciation": 2700,
    "interestExpense": 1200,
    "netProfit": 2900,
    "totalAssets": 42000,
    "intangibleAssets": 800,
    "equity": 18500,
    "financialDebt": 14000,
    "cash": 3200,
    "currentAssets": 16000,
    "inventory": 4500,
    "currentLiabilities": 9800
  }
]
```
