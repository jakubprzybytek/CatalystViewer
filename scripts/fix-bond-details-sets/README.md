# Fix BondDetails SS → L Migration

One-off script that converts `interestFirstDays`, `interestRightsDays`, `interestPayoffDays`, `interestFirstDayTss`, `interestRightsDayTss`, and `interestPayoffDayTss` fields in the **BondDetails** DynamoDB table from DynamoDB String Sets (`SS`) to Lists (`L`).

## Background

Before the `DynamoDBDocumentClient` refactor those fields were written using the raw `DynamoDBClient` with explicit `{ SS: [...] }` attribute values. The document client reads `SS` back as JavaScript `Set` objects, breaking callers that expect plain arrays.

This script scans the table, detects items that still have `Set`-typed fields, and rewrites them as sorted arrays:
- String date fields (`*Days`) — sorted lexicographically (ISO strings sort correctly that way).
- Numeric timestamp fields (`*Tss`) — sorted numerically ascending.

## Setup

1. Open `fix-bond-details-sets.ts` and set `TABLE_NAME` to the actual DynamoDB table name.
2. Install dependencies:

```bash
npm install
```

## Run

```bash
# Dry run first — scans and logs what would change, no writes
npm run fix:dry

# Live run — applies the changes
npm run fix
```

AWS credentials must be available in the environment (`AWS_PROFILE` or environment variables).
