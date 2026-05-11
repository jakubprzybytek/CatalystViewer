import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env.local') });

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop, type AgentEvent } from '@core/ai/agent/index';
import { WebSearchTool } from '@core/ai/tools/WebSearchTool';
import { StockwatchTool } from '@core/ai/tools/StockwatchTool';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { MODEL_ID } from '@core/ai/issuers/IssuerClassification';

// ─── Types ────────────────────────────────────────────────────────────────────

type YearlyIndicators = {
    year: number;
    revenue: number | null;      // PLN millions
    ebitda: number | null;       // PLN millions
    netDebt: number | null;      // PLN millions (total debt - cash)
    netIncome: number | null;    // PLN millions
};

type FundamentalAnalysis = {
    companyName: string;
    currency: string;
    unit: string;
    years: YearlyIndicators[];
    notes: string;
};

// ─── CLI args ─────────────────────────────────────────────────────────────────

const issuerName = process.argv[2];

if (!issuerName) {
    console.error('Usage: npx tsx analyze-issuer.ts "<Issuer Name>"');
    process.exit(1);
}

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
    console.error('Error: TAVILY_API_KEY environment variable is not set.');
    console.error('Create a .env.local file with: TAVILY_API_KEY=tvly-your-key-here');
    process.exit(1);
}

// ─── Agent setup ──────────────────────────────────────────────────────────────

const bedrockClient = new BedrockRuntimeClient({});
const tavilyClient = new TavilyClient(tavilyApiKey!);
const webSearchTool = new WebSearchTool(tavilyClient);
const stockwatchTool = new StockwatchTool();
const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [stockwatchTool, webSearchTool], 8);

const taskPrompt = `Jesteś analitykiem finansowym badającym polskie spółki emitujące obligacje na rynku Catalyst.

Twoim zadaniem jest znalezienie i zebranie kluczowych wskaźników finansowych dla podanej spółki.

Nazwa spółki: "${issuerName}"

Podana nazwa to zarejestrowana nazwa prawna (np. "P4 Sp. z o.o." to podmiot prawny stojący za siecią komórkową Play).

Instrukcje:
1. Zidentyfikuj spółkę lub markę kryjącą się za tą nazwą prawną.
2. Użyj narzędzia stockwatch_financials z popularną nazwą spółki, aby pobrać dane finansowe bezpośrednio ze stockwatch.pl — to jest Twoje główne i najbardziej wiarygodne źródło.
3. Jeśli stockwatch.pl nie zwróci użytecznych danych, uzupełnij je przez web_search, szukając raportów rocznych, wyników finansowych lub stron relacji inwestorskich (np. Bankier.pl, Stooq.pl, oficjalne raporty okresowe).
4. Skup się na: Przychodach (Revenue), EBITDA, Długu netto (zadłużenie ogółem minus gotówka), Zysku netto (Net Income).
5. Wszystkie wartości pieniężne podaj w milionach PLN (jeśli dane są w tysiącach — podziel przez 1000; jeśli w miliardach — pomnóż przez 1000). Jeśli spółka raportuje w innej walucie, zaznacz to w polu currency.
6. Ogranicz się do maksymalnie 8 wywołań narzędzi. Zakończ, gdy masz wystarczające dane dla większości wskaźników — nie szukaj perfekcji. Uzupełnij JSON tym, co znalazłeś, wstawiając null dla brakujących wartości.

Odpowiedz WYŁĄCZNIE obiektem JSON — bez markdown, bez wyjaśnień:
{
  "companyName": "<popularna nazwa lub marka spółki>",
  "currency": "PLN",
  "unit": "millions",
  "years": [
    {
      "year": <YYYY>,
      "revenue": <liczba lub null jeśli nie znaleziono>,
      "ebitda": <liczba lub null jeśli nie znaleziono>,
      "netDebt": <liczba lub null jeśli nie znaleziono>,
      "netIncome": <liczba lub null jeśli nie znaleziono>
    }
  ],
  "notes": "<krótka notatka o źródłach danych lub zastrzeżeniach, np. szacunkowe dane, różnice w roku obrotowym>"
}

Uwzględnij do 5 lat, posortowanych od najnowszego do najstarszego. Uwzględniaj tylko lata, dla których znalazłeś co najmniej jeden wskaźnik.`;

// ─── Live event handler ───────────────────────────────────────────────────────

function onEvent(event: AgentEvent): void {
    const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '...' : s;

    switch (event.type) {
        case 'tool_use': {
            const input = event.input as Record<string, unknown>;
            if (event.toolName === 'stockwatch_financials') {
                const name = typeof input['companyName'] === 'string' ? input['companyName'] : JSON.stringify(input);
                console.log(`\n[iter ${event.iteration}] stockwatch.pl lookup: "${name}"`);
            } else {
                const query = typeof input['query'] === 'string' ? input['query'] : JSON.stringify(input);
                console.log(`\n[iter ${event.iteration}] Searching: "${query}"`);
            }
            break;
        }
        case 'tool_result': {
            if (event.toolName === 'stockwatch_financials') {
                console.log(`           ${truncate(event.result, 200)}`);
            } else {
                let results: Array<{ url: string; title: string; content: string }> = [];
                try { results = JSON.parse(event.result); } catch { /* not JSON */ }
                if (results.length > 0) {
                    console.log(`           Got ${results.length} result(s):`);
                    for (const r of results) {
                        console.log(`             · ${r.url}`);
                        console.log(`               ${truncate(r.title, 80)}`);
                        console.log(`               ${truncate(r.content, 120)}`);
                    }
                }
            }
            break;
        }
        case 'end_turn':
            console.log(`\n[iter ${event.iteration}] Agent finished.`);
            break;
        case 'usage':
            console.log(`\nTokens:  input=${event.inputTokens.toLocaleString()}  output=${event.outputTokens.toLocaleString()}  total=${event.totalTokens.toLocaleString()}`);
            break;
    }
}

// ─── Result parsing ───────────────────────────────────────────────────────────

function parseResult(text: string): FundamentalAnalysis {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Response does not contain a JSON object');
    }
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    if (
        typeof parsed['companyName'] !== 'string' ||
        !Array.isArray(parsed['years'])
    ) {
        throw new Error('Response missing required fields');
    }
    return parsed as unknown as FundamentalAnalysis;
}

// ─── Output formatting ────────────────────────────────────────────────────────

function fmt(value: number | null): string {
    if (value === null) return '       —';
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(8);
}

function printTable(result: FundamentalAnalysis): void {
    const unit = `${result.currency} ${result.unit}`;
    console.log(`\nCompany:  ${result.companyName}`);
    console.log(`Issuer:   ${issuerName}`);
    console.log(`Unit:     ${unit}\n`);

    const header = 'Year     Revenue    EBITDA   Net Debt  Net Income';
    const sep    = '────  ─────────  ────────  ─────────  ──────────';
    console.log(header);
    console.log(sep);

    for (const y of result.years) {
        const row = [
            String(y.year).padEnd(4),
            fmt(y.revenue),
            fmt(y.ebitda),
            fmt(y.netDebt),
            fmt(y.netIncome),
        ].join('  ');
        console.log(row);
    }

    if (result.notes) {
        console.log(`\nNotes: ${result.notes}`);
    }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

console.log(`Issuer:  ${issuerName}`);
console.log(`Model:   ${MODEL_ID}`);
console.log('─'.repeat(80));

try {
    const rawAnswer = await agentLoop.run(taskPrompt, onEvent);
    const result = parseResult(rawAnswer);

    console.log('\n' + '═'.repeat(60));
    printTable(result);
    console.log('═'.repeat(60));
} catch (error) {
    console.error('Failed:', error instanceof Error ? error.message : error);
    process.exit(1);
}
