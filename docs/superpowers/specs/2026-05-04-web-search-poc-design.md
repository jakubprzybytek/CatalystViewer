# Design: Web Search PoC — AI Agent with Tool Use

**Date:** 2026-05-04  
**Status:** Approved

---

## Overview

A proof-of-concept that proves the "AI agent with tools" pattern using AWS Bedrock and Tavily web search. The immediate task is: given a Polish company's legal name, find its official website URL via web search. This is the first step toward a broader agent that will perform financial analysis on bond issuers stored in the application database.

The PoC consists of:
- A generic agent loop in `packages/core` (reusable, Lambda-ready)
- A `WebSearchTool` backed by the Tavily REST API
- A CLI script in `scripts/` for manual testing

---

## Module Structure

```
packages/core/src/ai/agent/
    index.ts                 ← re-exports public API (AgentLoop, AgentTool)
    AgentLoop.ts             ← Bedrock tool-use loop
    Tool.ts                  ← AgentTool interface and types

packages/core/src/ai/tools/
    index.ts
    WebSearchTool.ts         ← Tavily search, implements AgentTool

packages/core/src/ai/tools/tavily/
    index.ts
    TavilyClient.ts          ← minimal Tavily REST API wrapper

scripts/find-issuer-website/
    package.json
    sst-env.d.ts
    README.md
    find-issuer-website.ts   ← CLI entry point
```

The `packages/core/src/ai/issuers/` module (existing classification logic) is not changed by this work.

---

## AgentTool Interface

Defined in `Tool.ts`:

```ts
export interface AgentTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>; // JSON Schema object
    execute(input: unknown): Promise<string>;
}
```

Each tool is a self-contained object. The loop does not know what tools do — it only calls `execute()` and passes the string result back to the model.

---

## AgentLoop

`AgentLoop` runs the Bedrock Converse tool-use cycle. It is constructed with:
- `bedrockClient: BedrockRuntimeClient`
- `modelId: string`
- `tools: AgentTool[]`

Public API:

```ts
class AgentLoop {
    constructor(bedrockClient: BedrockRuntimeClient, modelId: string, tools: AgentTool[])
    async run(taskPrompt: string): Promise<string>
}
```

### Loop logic

```
1. Build message history: [{ role: "user", content: taskPrompt }]
2. Send history + tool specs to Bedrock Converse
3. Receive response
   - stopReason == "tool_use":
       a. Append assistant turn to history
       b. Execute each tool_use block (sequentially)
       c. Append tool results as a "user" turn
       d. Go to step 2
   - stopReason == "end_turn":
       Return the final text content from the response
4. If iterations exceed MAX_ITERATIONS (10), throw LoopLimitExceeded
```

### Error handling

| Scenario | Behaviour |
|---|---|
| Tool `execute()` throws | Caught; returned to model as `isError: true` tool result with the error message. Model decides how to proceed. |
| Model returns no text and no tool use | Throw `UnexpectedStopReason` |
| Loop exceeds MAX_ITERATIONS | Throw `LoopLimitExceeded` |

`AgentLoop.run()` is stateless — no persistence between calls.

---

## WebSearchTool

Implements `AgentTool`:

| Property | Value |
|---|---|
| `name` | `"web_search"` |
| `description` | `"Search the web for information. Returns a list of relevant results with URL, title, and content snippet."` |
| Input schema | `{ query: string }` |
| Max results | 5 |

`execute()` calls `TavilyClient.search()`, serializes the result array to a compact JSON string, and returns it. The model receives `[{ url, title, content }, ...]`.

---

## TavilyClient

A minimal wrapper over the Tavily REST API. No third-party Tavily SDK.

```ts
class TavilyClient {
    constructor(apiKey: string)
    async search(query: string, maxResults?: number): Promise<TavilySearchResult[]>
}

type TavilySearchResult = {
    url: string;
    title: string;
    content: string;
};
```

Calls `POST https://api.tavily.com/search` with `{ api_key, query, max_results, search_depth: "basic" }`. Uses Node's built-in `fetch`.

---

## Script: find-issuer-website

Entry point: `scripts/find-issuer-website/find-issuer-website.ts`

**Startup checks:**
- CLI arg present (issuer name); exits with usage message if missing
- `TAVILY_API_KEY` env var present; exits with clear message if missing

**What it does:**
1. Creates `BedrockRuntimeClient` (uses ambient AWS credentials)
2. Creates `TavilyClient` from `TAVILY_API_KEY`
3. Instantiates `WebSearchTool` and `AgentLoop`
4. Calls `AgentLoop.run()` with the task prompt:
   > "Find the official website URL of the Polish company with legal name '{issuerName}'. Search the web to confirm it. Return only the URL, nothing else."
5. Prints structured output (see below)

**Output format:**
```
Issuer:  P4 Sp. z o.o.
Website: https://www.play.pl

--- Agent trace ---
[1] tool_use     web_search  {"query": "P4 Sp. z o.o. official website Poland"}
[1] tool_result              [{"url":"https://www.play.pl","title":"Play",...},...]
[2] end_turn                 https://www.play.pl
```

The trace shows iteration number, event type, tool name (where applicable), and a truncated payload — enough to evaluate model behaviour without flooding the terminal.

---

## Environment Variables

| Variable | Where set |
|---|---|
| `TAVILY_API_KEY` | `.env.local` for local development; GitHub Secrets for deployed environments |
| AWS credentials | Ambient (`~/.aws/credentials` or environment variables) — same as all other scripts |

The script loads `.env.local` at startup using `dotenv` (added as a dev dependency to the script's `package.json`).

---

## Dependencies

Added to `scripts/find-issuer-website/package.json`:
- `@aws-sdk/client-bedrock-runtime` (same version as workspace)
- `dotenv` (for `.env.local` loading)
- `tsx` + `typescript` (devDependencies, same pattern as other scripts)

No new dependencies added to `packages/core` — `@aws-sdk/client-bedrock-runtime` is already present.

---

## Testing

Manual only. Run from the script directory:

```bash
cd scripts/find-issuer-website
pnpm install
TAVILY_API_KEY=tvly-xxx pnpm tsx find-issuer-website.ts "P4 Sp. z o.o."
TAVILY_API_KEY=tvly-xxx pnpm tsx find-issuer-website.ts "Kruk S.A."
TAVILY_API_KEY=tvly-xxx pnpm tsx find-issuer-website.ts "Echo Investment S.A."
```

Or with `.env.local`:
```bash
pnpm tsx find-issuer-website.ts "Kruk S.A."
```

**Success criteria for the PoC:**
- Model correctly identifies the website for well-known issuers
- Agent trace shows sensible search queries
- Result is produced in 1-3 iterations for straightforward cases

---

## Future Direction

When this PoC is promoted to production:
- `AgentLoop` and `AgentTool` move to `packages/core` as-is (they're already there)
- A Lambda handler in `packages/functions/src/issuers/` instantiates the agent for each issuer — same wiring as the script
- New tools (web scraping, PDF downloading) are added as new `AgentTool` implementations in `packages/core/src/ai/tools/`
- `TAVILY_API_KEY` gets added to the SST config as a secret
