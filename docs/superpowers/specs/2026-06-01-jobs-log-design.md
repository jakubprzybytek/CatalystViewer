# Design: Jobs Log for Workflow Executions

**Date:** 2026-06-01  
**Status:** Draft

---

## Overview

Add a persistent jobs log for workflow executions so users can list and inspect runs from:

- Bonds update workflow (`BondsUpdaterStateMachine`, including issuer classification routine)
- Issuer analysis workflow (`FundamentalAnalysisStateMachine`)

The jobs log is a separate page/view in the web app, accessible from a new menu button in the app header. The menu contains two actions:

- Jobs
- Logout

This feature persists only new executions from rollout onward (no backfill).

---

## Goals

- Persist each new workflow execution in DynamoDB.
- Show a dedicated Jobs page for all authenticated users.
- Support list view with:
  - newest-first ordering
  - status filter: `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMED_OUT`
  - load-more pagination
- Support job detail view with expandable sections for:
  - input parameters summary
  - outputs summary (the same core information that normally appears in completion emails)
  - error summary

---

## Non-Goals

- Backfilling old Step Functions executions.
- Role-based restriction for Jobs page (all authenticated users can view it in this version).
- Integration or end-to-end test coverage in this story (unit tests only).

---

## Architecture

Use a dedicated jobs-log read model in DynamoDB. Workflows write compact execution summaries at runtime; API and web read from this model only.

Boundary responsibilities:

- Step Functions/Lambdas: write and update job records.
- Storage layer (`packages/core`): owns schema and query/update operations.
- API (`packages/functions` + `infra/api.ts`): list and detail endpoints for jobs.
- Web (`packages/web`): menu entry, jobs list view, job detail view.

The UI does not query Step Functions directly. It relies solely on persisted records.

---

## Components

### 1) Storage: Jobs table + table adapter

Add a new DynamoDB table and a core storage adapter (pattern aligned with existing `*Table` classes).

Suggested record shape:

```ts
export type JobWorkflowType = "BONDS_UPDATER" | "FUNDAMENTAL_ANALYSIS";

export type JobStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "TIMED_OUT";

export type DbJobRecord = {
  // Internal query keys
  listPk: "JOB";
  listSk: number; // startedAtTs
  statusPk: string; // STATUS#<JobStatus>

  // Primary identity
  jobId: string; // stable app-level id (not the Step Functions ARN)
  workflowType: JobWorkflowType;
  executionArn: string;

  // Query and display fields
  status: JobStatus;
  startedAt: string;   // ISO 8601
  startedAtTs: number; // epoch ms
  endedAt?: string;    // ISO 8601
  endedAtTs?: number;  // epoch ms
  durationMs?: number;

  // Compact summaries used by UI
  inputSummary: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorSummary?: {
    stage?: string;
    errorType?: string;
    message?: string;
  };
};
```

Notes:

- Keep summaries compact and stable for UI rendering.
- Keep retention indefinite in this version (no TTL field configured).
- Table/index strategy:
  - Primary index: `listPk` (hash), `listSk` (range) for newest-first list pagination.
  - GSI on `jobId` for detail lookup.
  - GSI on `executionArn` for operational traceability lookups.
  - GSI on `statusPk` + `listSk` for status-filtered newest-first pagination.

### 2) Workflow instrumentation

Both state machines write/update the same `DbJobRecord` keyed by workflow and job id.

- On start: write record with `RUNNING` + `inputSummary`.
- On success: set `SUCCEEDED`, `endedAt*`, `durationMs`, `outputSummary`.
- On failure/timeout: set terminal status and `errorSummary`.

For `BondsUpdaterStateMachine`, output summary should mirror key completion-email information (for example: updated count, new bonds, deactivated bonds, classification outcomes).

For `FundamentalAnalysisStateMachine`, output summary should mirror analysis completion-email information (for example: selected issuers, success/failure counts, key per-issuer result markers).

### 3) API surface

Add endpoints for authenticated users:

- `GET /api/jobs`
- `GET /api/jobs/{jobId}`

`GET /api/jobs` supports:

- `statuses` filter (subset of supported statuses)
- pagination cursor (exclusive start key style)
- fixed newest-first order

`GET /api/jobs/{jobId}` returns the full job record for detail display.

### 4) Web UX

Add header menu trigger and dedicated Jobs page.

- Header: replace direct logout icon affordance with menu button.
- Menu entries:
  - Jobs -> navigates to Jobs page
  - Logout -> existing logout behavior
- Jobs page:
  - list/table with workflow, status, started/ended, duration
  - status filter control
  - load-more action
  - open detail view for a selected row
- Job detail view:
  - expandable Input Summary section
  - expandable Output Summary section
  - expandable Error Summary section

---

## Data Flow

1. User (or scheduler/manual trigger) starts a workflow execution.
2. Workflow start stage writes jobs record with `RUNNING` state.
3. Workflow executes business logic.
4. Terminal stage updates same jobs record to `SUCCEEDED`, `FAILED`, or `TIMED_OUT`.
5. API list endpoint reads jobs table (newest-first, paginated, optional status filter).
6. API detail endpoint reads one record by job id.
7. Jobs page renders list and detail entirely from API responses.

---

## Error Handling

- Logging failures should not break core workflow business behavior.
- Each terminal path should attempt to persist terminal job state.
- `errorSummary` should be human-readable and compact.
- Detail view should gracefully handle missing optional sections.
- API returns:
  - `404` for unknown job id
  - `400` for invalid status filter values

---

## Testing

Unit tests only for this story.

Required unit coverage:

- Jobs storage adapter:
  - create/start record
  - terminal updates for success/failure/timeout
  - list newest-first with status filter
  - pagination cursor behavior
  - get-by-id behavior
- Mapping/summary builders:
  - bonds workflow input/output summary shaping
  - analysis workflow input/output summary shaping
  - error summary shaping
- API handler units:
  - valid list requests
  - invalid filter validation
  - detail found/not-found handling

No integration or E2E tests in this scope.

---

## Infra and File Map

Planned file changes:

- `infra/storage.ts` (modify): add jobs table definition
- `infra/api.ts` (modify): add jobs API lambdas and routes
- `infra/updater.ts` (modify): instrument both workflows to write job records
- `packages/core/src/storage/jobs/JobsTable.ts` (create): jobs storage adapter
- `packages/core/src/storage/jobs/index.ts` (create): exports
- `packages/core/src/index.ts` (modify): export jobs storage module
- `packages/functions/src/jobs/getJobs.ts` (create): list handler
- `packages/functions/src/jobs/getJob.ts` (create): detail handler
- `packages/functions/src/jobs/index.ts` (create/modify): request/response types
- `packages/web/src/sdk/Jobs.ts` (create): jobs API client
- `packages/web/src/...` (modify): menu trigger/menu entries and jobs page/detail UI

Exact frontend file paths should follow existing app shell/navigation patterns discovered during implementation.

---

## Open Decisions Resolved

- Separate page/view for jobs: yes.
- Menu behavior: one menu trigger with entries Jobs + Logout.
- Job detail depth: full detail page plus expandable input/output/error summaries.
- Output persistence strategy: compact summary at execution time.
- Historical backfill: none.
- Statuses surfaced in list filter: `RUNNING`, `SUCCEEDED`, `FAILED`, `TIMED_OUT`.
- List strategy: newest-first + load-more pagination.
- Retention: indefinite.
- Visibility: all authenticated users.
- Test scope: unit tests only.
