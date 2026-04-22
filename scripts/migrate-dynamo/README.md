# DynamoDB Migration Script

Copies items from source DynamoDB tables to target tables. Designed as a one-off script for migrating data between SST stages or stack naming conventions.

## Setup

1. Open `migrate.ts` and update the `TABLES` array and `REGION` constant at the top of the file with your actual source and target table names.

2. Install dependencies:

```bash
npm install
```

## Run

```bash
npm run migrate
```

## Notes

- The script uses `BatchWrite` with automatic retries and exponential backoff for unprocessed items.
- It does not delete items from the source table.
- AWS credentials must be configured in the environment (e.g. via `AWS_PROFILE` or environment variables).
