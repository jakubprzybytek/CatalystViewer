---
name: code-base-functions
description: "**CODEBASE CONVENTION** — Defines where AI/ML business logic lives and how Lambda functions should delegate to it. USE FOR: adding or updating AI/ML logic invoked by Lambda functions; reviewing Lambda handlers for correct separation of concerns; moving inline AI logic out of Lambda handlers into the core package. DO NOT USE FOR: non-AI Lambda handlers; storage layer changes; frontend code."
---

# Code Base Functions Skill

## Overview

AI/ML business logic must live in the **`packages/core`** package under a dedicated `src/ai/` folder, organised by domain. Lambda function handlers in `packages/functions` are responsible only for:

1. Receiving inputs (event payload, AWS resource references)
2. Delegating the actual work to functions imported from `@core/ai/<domain>`
3. Persisting results and returning outputs

No AI/ML logic (prompt construction, model invocation, response parsing) belongs inside a Lambda handler file.

## Folder Structure

```
packages/core/src/ai/
└── <domain>/
    ├── <operation>.ts   ← exported function(s) + types
    └── index.ts         ← re-exports everything from the domain
```

**Example — issuer classification:**

```
packages/core/src/ai/
└── issuers/
    ├── classifyIssuer.ts   ← classifyIssuer(), MODEL_ID, INDUSTRY_LABELS, types
    └── index.ts            ← export * from './classifyIssuer'
```

## Rules

### 1. Core package owns AI logic

All of the following belong in `packages/core/src/ai/<domain>/`:

- Model ID constants
- Prompt-building functions
- Response-parsing functions
- The function that calls the AI service (e.g. `BedrockRuntimeClient`)

### 2. Lambda handlers own I/O only

A Lambda handler in `packages/functions` may:

- Instantiate AWS clients (DynamoDB, Bedrock, etc.) and pass them into core functions
- Call core AI functions with the prepared clients
- Persist the result to a storage table
- Return a typed result object

A Lambda handler must **not** contain prompt strings, JSON parsing for model responses, or model IDs.

### 3. AI clients are constructed in the handler, injected into core

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

### 4. Bedrock dependency lives in both packages

`@aws-sdk/client-bedrock-runtime` must be listed in `packages/core/package.json` as well as in `packages/functions/package.json`. Use strict (no `^`) version pinning consistent with the rest of the dependencies.

### 5. Path alias for imports

Import core AI helpers via the `@core/ai/<domain>` alias (configured in `packages/functions/tsconfig.json`):

```typescript
import { classifyIssuer, MODEL_ID } from '@core/ai/issuers';
```

## How to Apply

When adding a new AI operation or moving existing AI logic out of a Lambda handler:

1. Create `packages/core/src/ai/<domain>/<operation>.ts` with the AI function and all supporting types/constants.
2. Create or update `packages/core/src/ai/<domain>/index.ts` to re-export the new module.
3. Ensure `@aws-sdk/client-bedrock-runtime` (or the relevant AI SDK) is in `packages/core/package.json` with a strict version.
4. Update the Lambda handler to import from `@core/ai/<domain>` and remove the inline AI logic.
