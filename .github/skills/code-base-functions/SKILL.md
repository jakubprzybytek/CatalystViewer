---
name: code-base-functions
description: "**CODEBASE CONVENTION** — Defines where business logic and storage logic live and how Lambda functions should delegate to them. USE FOR: adding or updating any business logic invoked by Lambda functions; reviewing Lambda handlers for correct separation of concerns; moving inline logic out of Lambda handlers into the core package. DO NOT USE FOR: frontend code."
---

# Code Base Functions Skill

## Overview

Business logic and storage access must live in the **`packages/core`** package. Lambda function handlers in `packages/functions` are thin orchestrators responsible only for:

1. Taking and validating inputs (event payload, AWS resource references)
2. Orchestrating calls to core business logic functions and storage classes
3. Preparing and returning the response

No business logic (data fetching, transformation, external service calls, AI/ML, etc.) and no raw storage logic (DynamoDB commands, query construction) belongs inside a Lambda handler file.

## Folder Structure

```
packages/core/src/
├── <domain>/            ← general business logic for a domain
│   ├── <operation>.ts   ← exported function(s) + types
│   └── index.ts         ← re-exports everything from the domain
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

**Example — bond data fetching:**

```
packages/core/src/
└── bonds/
    ├── catalyst/
    │   ├── fetchBonds.ts   ← fetchBonds(), types
    │   └── index.ts
    └── index.ts
```

## Rules

### 1. Core package owns business logic

All domain logic belongs in `packages/core/src/<domain>/` (or `packages/core/src/ai/<domain>/` for AI/ML-specific operations). This includes:

- Data fetching and transformation functions
- Business rules and calculations
- External service calls (AI models, third-party APIs, etc.)
- Any supporting types and constants

### 2. Core package owns storage logic

All of the following belong in `packages/core/src/storage/<domain>/`:

- DynamoDB table classes with typed methods (`getAll`, `store`, `query`, etc.)
- `Db*` type definitions that mirror the DynamoDB table schema
- Any query construction, marshalling, or pagination logic

A Lambda handler may only call methods on storage table classes imported from `@core/storage/<domain>`. It must **not** contain raw `DynamoDB` commands, `ScanCommand`, `PutCommand`, or any DynamoDB SDK calls.

### 3. Lambda handlers orchestrate, they do not implement

A Lambda handler in `packages/functions` must:

- Validate and resolve inputs (e.g. cap values, defaults, flags)
- Instantiate AWS clients (DynamoDB, Bedrock, HTTP clients, etc.) and table classes
- Call core business logic functions and storage table methods in the correct order
- Map results into the output shape and return it

A Lambda handler must **not** contain:
- Business rules or domain logic
- External API / AI model call logic
- Raw DynamoDB commands
- Complex data transformation

### 4. External service clients are constructed in the handler, injected into core

Core functions accept external service clients as parameters to keep them testable without real AWS or network calls.

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

### 5. Dependencies used by core must be listed in both packages

Any package that `packages/core` uses (e.g. `@aws-sdk/client-bedrock-runtime`, HTTP clients) must be listed in both `packages/core/package.json` and `packages/functions/package.json`. Use strict (no `^`) version pinning consistent with the rest of the dependencies.

### 6. Path aliases for imports

Import core helpers via the aliases configured in `packages/functions/tsconfig.json`:

```typescript
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
import { fetchBonds } from '@core/bonds';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
```

## How to Apply

### Adding a new business logic operation

1. Create `packages/core/src/<domain>/<operation>.ts` with the function and all supporting types/constants.
2. Create or update `packages/core/src/<domain>/index.ts` to re-export the new module.
3. If the operation requires a new external dependency, add it to both `packages/core/package.json` and `packages/functions/package.json` with a strict version.
4. Update the Lambda handler to import from `@core/<domain>` and remove any inline logic.

### Adding a new AI operation

1. Create `packages/core/src/ai/<domain>/<operation>.ts` with the AI function and all supporting types/constants.
2. Create or update `packages/core/src/ai/<domain>/index.ts` to re-export the new module.
3. Ensure `@aws-sdk/client-bedrock-runtime` (or the relevant AI SDK) is in both `packages/core/package.json` and `packages/functions/package.json` with a strict version.
4. Update the Lambda handler to import from `@core/ai/<domain>` and remove the inline AI logic.

### Adding a new storage operation

1. Add the new method to the relevant table class in `packages/core/src/storage/<domain>/<Table>.ts`.
2. If needed, update the `Db*` type in `packages/core/src/storage/<domain>/index.ts`.
3. Update the Lambda handler to call the new table method instead of writing DynamoDB logic inline.
