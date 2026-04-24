---
name: adhoc-script
description: "Write a one-off ad-hoc script. Use when: creating a migration script, data fix script, one-time data update, standalone utility script, or any script that is not part of the application. Scripts live under the `scripts/` folder, are self-contained, have all inputs hardcoded, and support a dry-run mode that is the default."
---

# Ad-hoc Script

## Conventions

- Each script lives in its own folder under `scripts/<script-name>/`.
- The folder contains: the script file (`<script-name>.ts`), a `package.json`, and a `README.md`.
- The script is **standalone** — it does not import from `packages/` or depend on application code.
- All input parameters (table names, regions, IDs, etc.) are **hardcoded constants** at the top of the file in a clearly marked `Configuration` section. No CLI argument parsing.
- **Dry-run is the default mode.** The live mode must be explicitly opted into by passing `--live` (or equivalent flag defined in the script header comment).

## Structure

```
scripts/
└── <script-name>/
    ├── <script-name>.ts   ← the script
    ├── package.json
    └── README.md
```

## Script Template

```typescript
import { ... } from "...";

// ─── Configuration ────────────────────────────────────────────────────────────
// Fill in the values below before running.
//
// How to run:
//   npm install
//   npm run <script>       # dry run (default) — no writes
//   npm run <script>:live  # live run — applies changes
//
// AWS credentials must be available (AWS_PROFILE or env vars).

const REGION = "eu-west-1";
const TABLE_NAME = "replace-with-actual-table-name"; // ← replace before running

// ─── Core logic ───────────────────────────────────────────────────────────────

async function processItem(item: Record<string, unknown>, dryRun: boolean): Promise<void> {
  console.log(`  ${dryRun ? "[DRY RUN]" : ""} Processing ${item["id"]}...`);
  if (dryRun) return;
  // apply changes
}

async function run(dryRun: boolean): Promise<void> {
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE (will apply changes)"}\n`);

  // scan / query / iterate
  // call processItem for each record

  console.log("\nDone.");
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const dryRun = !process.argv.includes("--live");

run(dryRun).catch((error) => {
  console.error("Script failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
```

## package.json Template

```json
{
  "name": "<script-name>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "<script>": "tsx <script-name>.ts",
    "<script>:live": "tsx <script-name>.ts --live"
  },
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

## README.md Template

```markdown
# <Script Title>

One-off script that <what it does and why>.

## Setup

1. Open `<script-name>.ts` and fill in the `Configuration` section at the top.
2. Install dependencies:

\`\`\`bash
npm install
\`\`\`

## Run

\`\`\`bash
# Dry run first — reports what would change, no writes (default)
npm run <script>

# Live run — applies changes
npm run <script>:live
\`\`\`

AWS credentials must be available in the environment (`AWS_PROFILE` or env vars).
```

## Rules

- **Hardcode everything** — table names, region, IDs, thresholds. A developer must be able to read the config block and immediately understand what the script targets.
- **Dry run is default** — the entry point reads `!process.argv.includes('--live')`. A developer running `npm run <script>` without thinking should never cause writes.
- **Log clearly** — print the mode (`DRY RUN` / `LIVE`) at startup and summarise counts at the end.
- **Single responsibility** — one script, one job. Do not add flags to switch between different operations.
- **No shared code** — do not import from `packages/`. Copy or inline any helpers needed. This keeps the script runnable even after application code changes.
