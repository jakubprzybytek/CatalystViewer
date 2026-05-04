# find-issuer-website

PoC script: given a Polish company's legal name, uses an AI agent with web search to find its official website URL.

Demonstrates the "agent with tools" pattern using AWS Bedrock (Claude) and Tavily search.

## Setup

1. Install dependencies:

```bash
cd scripts/find-issuer-website
pnpm install
```

2. Create a `.env.local` file in this directory:

```
TAVILY_API_KEY=tvly-your-key-here
```

Get a free Tavily API key at https://app.tavily.com

3. Ensure AWS credentials are configured (`~/.aws/credentials` or environment variables) with Bedrock access in `eu-west-1`.

## Run

```bash
pnpm tsx find-issuer-website.ts "P4 Sp. z o.o."
pnpm tsx find-issuer-website.ts "Kruk S.A."
pnpm tsx find-issuer-website.ts "Echo Investment S.A."
```

## Output

```
Issuer:  P4 Sp. z o.o.
Website: https://www.play.pl

--- Agent trace ---
[1] tool_use     web_search   {"query":"P4 Sp. z o.o. official website Poland"}
[1] tool_result               [{"url":"https://www.play.pl","title":"Play",...}]
[2] end_turn                  https://www.play.pl
```
