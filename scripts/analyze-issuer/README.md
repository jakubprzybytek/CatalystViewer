# analyze-issuer

Uses an AI agent to fetch financial data for a Catalyst bond issuer and compute
a 6-dimension fundamental analysis scorecard.

The agent searches stockwatch.pl (primary) and the web (fallback) to collect
P&L and balance sheet figures for up to 5 years, then computes traffic-light
signals for Debt Burden, Debt Service, Liquidity, Profitability, Asset Coverage,
and Financial Trend.

## Prerequisites

- AWS credentials available in the environment (`AWS_PROFILE` or env vars) —
  used to call Bedrock (Claude).
- A Tavily API key for web search.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with your Tavily API key:

```
TAVILY_API_KEY=tvly-your-key-here
```

## Run

```bash
npm start -- "<Issuer Name>"
```

The issuer name should be the legal entity name as it appears on Catalyst,
e.g. `"P4 Sp. z o.o."` or `"Echo Investment S.A."`.

```bash
npm start -- "Dadelo S.A."
DEBUG=1 npm start -- "Dadelo S.A."
```

## Output

```
Company:  Echo Investment
Issuer:   Echo Investment S.A.
Unit:     PLN millions

Year   Revenue     EBIT  Net Profit     Equity  Fin. Debt
────  ────────  ───────  ──────────  ─────────  ─────────
2024     ...

Fundamental Scorecard:
──────────────────────────────────────────────────
●  Debt Burden
   ●  D/E                        0.85×
   ●  Net Debt/EBITDA             2.1×
●  Debt Service
   ●  ICR                         4.2×
...
```

Colored dots: green ● / yellow ● / red ● / n/a ○
