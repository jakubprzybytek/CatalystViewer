---
name: code-base-storage
description: "**CODEBASE CONVENTION** — Defines how datetime values must be stored in DynamoDB table type definitions. USE FOR: adding or updating datetime fields in any `Db*` storage type; reviewing storage table types for datetime field compliance; migrating existing datetime fields to the dual-field convention. DO NOT USE FOR: non-datetime fields; non-storage types; runtime logic unrelated to DB storage."
---

# Code Base Storage Skill

## Overview

All DynamoDB table classes (`Db*` types) that store date/time values must follow a **dual-field convention**: one field holds the unix timestamp (for business logic), and a companion field holds the same instant in ISO 8601 format (for human-readable debugging when inspecting the table directly).

## Datetime Field Convention

### Single datetime value

| Field | Type | Purpose |
|-------|------|---------|
| `<name>Ts` | `number` | Unix timestamp in milliseconds (`Date.now()`). Used by business logic. |
| `<name>` | `string` | Same instant as ISO 8601 string (`new Date(...).toISOString()`). Used for debugging. |

**Example:**

```typescript
export type DbIssuerProfile = {
    classifiedAt: string;    // ISO 8601 — e.g. "2024-03-15T10:30:00.000Z" (debugging)
    classifiedAtTs: number;  // Unix ms  — e.g. 1710498600000            (business logic)
};
```

### Collection of datetime values

| Field | Type | Purpose |
|-------|------|---------|
| `<name>Tss` | `number[]` | Array of unix timestamps in milliseconds. Used by business logic. |
| `<name>` | `string[]` | Same instants as ISO 8601 strings. Used for debugging. |

**Example:**

```typescript
export type DbBondDetails = {
    interestFirstDays: string[];    // ISO 8601 strings (debugging)
    interestFirstDayTss: number[];  // Unix ms timestamps (business logic)
};
```

## Rules

1. **Always add both fields together.** A `Ts`/`Tss` field must always have a companion field with the same base name (no suffix) holding the ISO representation, and vice versa.
2. **`Ts` / `Tss` field type is always `number` / `number[]`.** Never store an ISO string in a `Ts`/`Tss` field.
3. **Companion ISO field type is always `string` / `string[]`.** Never store a timestamp number in the companion field.
4. **Populate both fields at write time.** When storing a record, compute both values from the same `Date` object:

```typescript
const now = new Date();

await table.store({
    classifiedAt: now.toISOString(),   // ISO string
    classifiedAtTs: now.getTime(),      // unix ms
});
```

5. **Business logic reads the `Ts`/`Tss` field.** The ISO companion fields are for inspection only and should not drive application behaviour.
6. **Apply to all `Db*` type definitions** in `packages/core/src/storage/*/index.ts`.

## How to Apply

When adding a new datetime field or migrating an existing one:

1. Add or rename the field in the `Db*` type in `packages/core/src/storage/<module>/index.ts`.
2. Update every write site (typically in `packages/functions/`) to set both fields.
3. Update every read site if it previously consumed the field directly and now needs the `Ts` variant.
