# store-issuer-financials

Ingests issuer financial data (annual P&L and balance sheet figures) into the
`IssuerFinancials` DynamoDB table.

## Usage

```bash
npm install

# Dry run (no writes):
npm run store:dry -- <table-name> <path/to/financials.json>

# Live run:
npm run store -- <table-name> <path/to/financials.json>
```

Find the table name in the AWS console or in the SST deployment output.

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
