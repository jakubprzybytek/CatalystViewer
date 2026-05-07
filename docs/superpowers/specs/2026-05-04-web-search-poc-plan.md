# Implementation Plan: Web Search PoC — AI Agent with Tool Use

**Spec:** [2026-05-04-web-search-poc-design.md](./2026-05-04-web-search-poc-design.md)  
**Date:** 2026-05-04

---

## Steps

### Step 1 — `AgentTool` interface and types (`packages/core`)

Create `packages/core/src/ai/agent/Tool.ts`:
- Export `AgentTool` interface: `name`, `description`, `inputSchema`, `execute(input: unknown): Promise<string>`
- Export error classes: `LoopLimitExceeded`, `UnexpectedStopReason`

Create `packages/core/src/ai/agent/index.ts`:
- Re-export `AgentTool`, `LoopLimitExceeded`, `UnexpectedStopReason` from `./Tool`
- Re-export `AgentLoop` from `./AgentLoop` (forward declaration — file created in next step)

---

### Step 2 — `AgentLoop` (`packages/core`)

Create `packages/core/src/ai/agent/AgentLoop.ts`:
- Import `BedrockRuntimeClient`, `ConverseCommand` from `@aws-sdk/client-bedrock-runtime`
- Import `AgentTool`, `LoopLimitExceeded`, `UnexpectedStopReason` from `./Tool`
- `MAX_ITERATIONS = 10`
- Constructor: `(bedrockClient, modelId, tools)`
- Build tool specs from `AgentTool[]` in the Bedrock `ToolConfiguration` format
- `run(taskPrompt)`: implements the loop (see spec); tracks iteration count; handles tool errors via `isError: true`; returns final text string

---

### Step 3 — `TavilyClient` (`packages/core`)

Create `packages/core/src/ai/tools/tavily/TavilyClient.ts`:
- `TavilySearchResult` type: `{ url, title, content }`
- `TavilyClient` class: constructor takes `apiKey: string`
- `search(query, maxResults = 5)`: POST to `https://api.tavily.com/search`, uses `fetch`, returns `TavilySearchResult[]`
- Throws descriptive error if HTTP response is not ok

Create `packages/core/src/ai/tools/tavily/index.ts`:
- Re-export `TavilyClient`, `TavilySearchResult`

---

### Step 4 — `WebSearchTool` (`packages/core`)

Create `packages/core/src/ai/tools/WebSearchTool.ts`:
- Implements `AgentTool`
- Constructor: `(tavilyClient: TavilyClient)`
- `name`: `"web_search"`, `description`: as per spec
- `inputSchema`: JSON Schema with `{ type: "object", properties: { query: { type: "string" } }, required: ["query"] }`
- `execute(input)`: validates input has `query` string, calls `tavilyClient.search(query, 5)`, returns `JSON.stringify(results)`

Create `packages/core/src/ai/tools/index.ts`:
- Re-export `WebSearchTool`

---

### Step 5 — Script scaffold (`scripts/find-issuer-website`)

Create `scripts/find-issuer-website/package.json`:
- Same shape as `scripts/test-issuer-classification/package.json`
- Dependencies: `@aws-sdk/client-bedrock-runtime@3.896.0`, `dotenv`
- DevDependencies: `tsx`, `typescript`

Create `scripts/find-issuer-website/sst-env.d.ts`:
- Copy from another script (empty SST env reference for type resolution)

Create `scripts/find-issuer-website/README.md`:
- Setup instructions, usage examples, `.env.local` format

---

### Step 6 — Script entry point (`scripts/find-issuer-website`)

Create `scripts/find-issuer-website/find-issuer-website.ts`:
- Load `.env.local` via `dotenv/config`
- Read `process.argv[2]` as issuer name; exit with usage if missing
- Check `process.env.TAVILY_API_KEY`; exit with clear message if missing
- Create `BedrockRuntimeClient`, `TavilyClient`, `WebSearchTool`, `AgentLoop`
  - Use `MODEL_ID` imported from `@core/ai/issuers` (reuse existing constant)
- Instrument the loop output: hook into the agent trace by passing an optional `onEvent` callback to `AgentLoop.run()` (or subclass — keep it simple)
- Print final result and trace in the format specified in the spec

> **Note on trace output:** the `AgentLoop` itself should not print anything — the script is responsible for output. Consider passing an optional `onIteration` callback to `AgentLoop.run()` that the script uses to accumulate trace lines. This keeps the core module side-effect-free.

---

### Step 7 — Install dependencies and verify

```bash
cd scripts/find-issuer-website
pnpm install
pnpm tsc --noEmit   # type-check
```

Fix any type errors before proceeding.

---

### Step 8 — Manual smoke test

```bash
pnpm tsx find-issuer-website.ts "P4 Sp. z o.o."
pnpm tsx find-issuer-website.ts "Kruk S.A."
pnpm tsx find-issuer-website.ts "Echo Investment S.A."
```

Verify:
- Correct website returned for each
- Trace shows sensible queries
- Result in 1-3 iterations

---

## File Checklist

| File | Action |
|---|---|
| `packages/core/src/ai/agent/Tool.ts` | Create |
| `packages/core/src/ai/agent/AgentLoop.ts` | Create |
| `packages/core/src/ai/agent/index.ts` | Create |
| `packages/core/src/ai/tools/tavily/TavilyClient.ts` | Create |
| `packages/core/src/ai/tools/tavily/index.ts` | Create |
| `packages/core/src/ai/tools/WebSearchTool.ts` | Create |
| `packages/core/src/ai/tools/index.ts` | Create |
| `scripts/find-issuer-website/package.json` | Create |
| `scripts/find-issuer-website/sst-env.d.ts` | Create |
| `scripts/find-issuer-website/README.md` | Create |
| `scripts/find-issuer-website/find-issuer-website.ts` | Create |
| `packages/core/src/ai/issuers/index.ts` | No change |
