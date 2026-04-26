---
name: code-base-functions
description: "**CODEBASE CONVENTION** — Defines where AI/ML business logic and storage logic live and how Lambda functions should delegate to them. USE FOR: adding or updating AI/ML logic invoked by Lambda functions; reviewing Lambda handlers for correct separation of concerns; moving inline AI or storage logic out of Lambda handlers into the core package. DO NOT USE FOR: frontend code."
---

# Code Base Functions Skill

## Overview

Business logic (AI/ML) and storage access must live in the **`packages/core`** package. Lambda function handlers in `packages/functions` are thin orchestrators responsible only for:

1. Taking and validating inputs (event payload, AWS resource references)
2. Orchestrating calls to core AI/ML functions and storage classes
3. Preparing and returning the response

No AI/ML logic (prompt construction, model invocation, response parsing) and no raw storage logic (DynamoDB commands, query construction) belongs inside a Lambda handler file.

## Folder Structure

```
packages/core/src/
├── ai/
│   └── <domain>/
│       ├── <operation>.ts   ← exported AI function(s) + types
│       └── index.ts         ← re-exports everything from the domain
└── storage/
    └── <domain>/
        ├── <Table>.ts       ← DynamoDB table class with typed get/store methods
        └── index.ts         ← re-exports table class and Db* types
```

**Example — issuer classification:**

```
packages/core/src/
├── ai/issuers/
│   ├── classifyIssuer.ts   ← classifyIssuer(), MODEL_ID, INDUSTRY_LABELS, types
│   └── index.ts
└── storage/issuerProfiles/
    ├── IssuerProfilesTable.ts  ← IssuerProfilesTable class (getAll, store)
    └── index.ts                ← DbIssuerProfile type
```

## Rules

### 1. Core package owns AI logic

All of the following belong in `packages/core/src/ai/<domain>/`:

- Model ID constants
- Prompt-building functions
- Response-parsing functions
- The function that calls the AI service (e.g. `BedrockRuntimeClient`)

### 2. Core package owns storage logic

All of the following belong in `packages/core/src/storage/<domain>/`:

- DynamoDB table classes with typed methods (`getAll`, `store`, `query`, etc.)
- `Db*` type definitions that mirror the DynamoDB table schema
- Any query construction, marshalling, or pagination logic

A Lambda handler may only call methods on storage table classes imported from `@core/storage/<domain>`. It must **not** contain raw `DynamoDB` commands, `ScanCommand`, `PutCommand`, or any DynamoDB SDK calls.

### 3. Lambda handlers orchestrate, they do not implement

A Lambda handler in `packages/functions` must:

- Validate and resolve inputs (e.g. cap values, defaults)
- Instantiate AWS clients (DynamoDB, Bedrock, etc.) and table classes
- Call core AI functions and storage table methods in the correct order
- Map results into the output shape and return it

A Lambda handler must **not** contain:
- Prompt strings or model IDs
- JSON parsing for model responses
- Raw DynamoDB commands
- Complex data transformation or business rules

### 4. AI clients are constructed in the handler, injected into core

Core functions accept the AI client as a parameter to keep them testable without real AWS calls.

```typescript
// packages/core/src/ai/issuers/classifyIssuer.ts
export async function classifyIssuer(
    bedrockClient: BedrockRuntimeClient,
    issuerName: string
): Promise<ClassificationResponse> { ... }
```

```typescript
// packages/functions/src/issuers/classifyIssuers.ts
const bedrockClient = new BedrockRuntimeClient({ maxAttempts: 1 });
const classification = await classifyIssuer(bedrockClient, issuerName);
```

### 5. Bedrock dependency lives in both packages

`@aws-sdk/client-bedrock-runtime` must be listed in `packages/core/package.json` as well as in `packages/functions/package.json`. Use strict (no `^`) version pinning consistent with the rest of the dependencies.

### 6. Path aliases for imports

Import core helpers via the aliases configured in `packages/functions/tsconfig.json`:

```typescript
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
```

## How to Apply

### Adding a new AI operation

1. Create `packages/core/src/ai/<domain>/<operation>.ts` with the AI function and all supporting types/constants.
2. Create or update `packages/core/src/ai/<domain>/index.ts` to re-export the new module.
3. Ensure `@aws-sdk/client-bedrock-runtime` (or the relevant AI SDK) is in `packages/core/package.json` with a strict version.
4. Update the Lambda handler to import from `@core/ai/<domain>` and remove the inline AI logic.

### Adding a new storage operation

1. Add the new method to the relevant table class in `packages/core/src/storage/<domain>/<Table>.ts`.
2. If needed, update the `Db*` type in `packages/core/src/storage/<domain>/index.ts`.
3. Update the Lambda handler to call the new table method instead of writing DynamoDB logic inline.
