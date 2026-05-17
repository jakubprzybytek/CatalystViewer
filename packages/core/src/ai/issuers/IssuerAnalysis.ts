import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { AgentLoop, type AgentEvent } from '../agent/index';
import { WebSearchTool } from '../tools/WebSearchTool';
import { StockwatchTool } from '../tools/StockwatchTool';
import { BiznesradarTool } from '../tools/BiznesradarTool';
import { TavilyClient } from '../tools/tavily/TavilyClient';
import { MODEL_ID } from './IssuerClassification';
import { computeScorecard, type FundamentalScorecard, type Signal } from '../../bonds/fundamentals/scorecard';

// ─── Types ────────────────────────────────────────────────────────────────────

export type YearlyFinancials = {
    year: number;
    revenue?: number | null;
    ebit?: number | null;
    depreciation?: number | null;
    interestExpense?: number | null;
    netProfit?: number | null;
    totalAssets?: number | null;
    intangibleAssets?: number | null;
    equity?: number | null;
    financialDebt?: number | null;
    cash?: number | null;
    currentAssets?: number | null;
    inventory?: number | null;
    currentLiabilities?: number | null;
};

export type AgentFinancials = {
    companyName: string;
    currency: string;
    unit: string;
    years: YearlyFinancials[];
    notes: string;
};

export type IssuerAnalysisDeps = {
    bedrockClient: BedrockRuntimeClient;
    tavilyClient: TavilyClient;
};

export type IssuerAnalysisResult = {
    issuerName: string;
    scorecard: FundamentalScorecard;
    agentFinancials: AgentFinancials;
    agentLog: AgentEvent[];
    reportMarkdown: string;
    modelId: string;
};

// ─── Task prompt ──────────────────────────────────────────────────────────────

function buildTaskPrompt(issuerName: string): string {
    return `Jesteś analitykiem finansowym badającym polskie spółki emitujące obligacje na rynku Catalyst.

Twoim zadaniem jest zebranie pełnych danych finansowych (rachunek zysków i strat oraz bilans) dla podanej spółki.

Nazwa spółki: "${issuerName}"

Podana nazwa to zarejestrowana nazwa prawna (np. "P4 Sp. z o.o." to podmiot prawny stojący za siecią komórkową Play).

Instrukcje:
1. Zidentyfikuj spółkę lub markę kryjącą się za tą nazwą prawną.
2. Użyj narzędzia stockwatch_financials z popularną nazwą lub tickerem GPW — to jest Twoje główne źródło danych (zwraca roczny rachunek zysków i strat oraz bilans za wiele lat w jednym wywołaniu).
3. Jeśli stockwatch nie znajdzie spółki, spróbuj biznesradar_financials.
4. Tylko jeśli oba powyższe zawiodą, uzupełnij brakujące dane przez web_search (Bankier.pl, raporty roczne spółki).
4. Zbierz następujące dane dla maksymalnie 5 ostatnich lat:
   - Rachunek zysków i strat: Przychody (revenue), EBIT, Amortyzacja (depreciation), Koszty odsetkowe (interestExpense), Zysk netto (netProfit)
   - Bilans: Aktywa ogółem (totalAssets), Wartości niematerialne (intangibleAssets), Kapitał własny (equity), Dług finansowy (financialDebt), Gotówka (cash), Aktywa obrotowe (currentAssets), Zapasy (inventory), Zobowiązania krótkoterminowe (currentLiabilities)
5. Uwaga: oba narzędzia finansowe zwracają wartości w tysiącach PLN — podziel przez 1000 aby uzyskać miliony. Jeśli spółka raportuje w innej walucie, zaznacz to w polu currency.
6. Ogranicz się do maksymalnie 5 wywołań narzędzi. Wstaw null dla brakujących wartości.

Odpowiedz WYŁĄCZNIE obiektem JSON — bez markdown, bez wyjaśnień:
{
  "companyName": "<popularna nazwa lub marka spółki>",
  "currency": "PLN",
  "unit": "millions",
  "years": [
    {
      "year": <YYYY>,
      "revenue": <number|null>,
      "ebit": <number|null>,
      "depreciation": <number|null>,
      "interestExpense": <number|null>,
      "netProfit": <number|null>,
      "totalAssets": <number|null>,
      "intangibleAssets": <number|null>,
      "equity": <number|null>,
      "financialDebt": <number|null>,
      "cash": <number|null>,
      "currentAssets": <number|null>,
      "inventory": <number|null>,
      "currentLiabilities": <number|null>
    }
  ],
  "notes": "<źródła, zastrzeżenia>"
}

Uwzględnij lata posortowane od najnowszego do najstarszego. Uwzględniaj tylko lata, dla których znalazłeś co najmniej jeden wskaźnik.`;
}

// ─── Result parsing ───────────────────────────────────────────────────────────

function parseAgentFinancials(text: string): AgentFinancials {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
        throw new Error('Agent response does not contain a JSON object');
    }
    // Strip thousands-separator spaces that LLMs sometimes copy from source data
    let json = text.slice(start, end + 1);
    while (/\d [ \u00a0]\d/.test(json)) {
        json = json.replace(/(\d)[ \u00a0](\d)/g, '$1$2');
    }
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (typeof parsed['companyName'] !== 'string' || !Array.isArray(parsed['years'])) {
        throw new Error('Agent response missing required fields');
    }
    return parsed as unknown as AgentFinancials;
}

// ─── Markdown report builder ──────────────────────────────────────────────────

function signalEmoji(signal: Signal): string {
    switch (signal) {
        case 'green':  return '🟢';
        case 'yellow': return '🟡';
        case 'red':    return '🔴';
        case 'na':     return '⚪';
    }
}

function fmt(value: number | null | undefined): string {
    if (value == null) return '—';
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function buildReportMarkdown(
    issuerName: string,
    agentFinancials: AgentFinancials,
    scorecard: FundamentalScorecard,
    agentEvents: AgentEvent[],
): string {
    const now = new Date().toISOString();
    const lines: string[] = [];

    lines.push(`# Fundamental Analysis: ${issuerName}`);
    lines.push('');
    lines.push(`**Date:** ${now}`);
    lines.push(`**Model:** ${MODEL_ID}`);
    lines.push(`**Company:** ${agentFinancials.companyName} (${agentFinancials.currency} ${agentFinancials.unit})`);
    lines.push('');

    // Financial data table
    lines.push('## Financial Data');
    lines.push('');
    lines.push('| Year | Revenue | EBIT | Net Profit | Equity | Fin. Debt |');
    lines.push('|------|--------:|-----:|-----------:|-------:|----------:|');
    for (const y of agentFinancials.years) {
        lines.push(`| ${y.year} | ${fmt(y.revenue)} | ${fmt(y.ebit)} | ${fmt(y.netProfit)} | ${fmt(y.equity)} | ${fmt(y.financialDebt)} |`);
    }
    if (agentFinancials.notes) {
        lines.push('');
        lines.push(`**Notes:** ${agentFinancials.notes}`);
    }
    lines.push('');

    // Scorecard
    lines.push('## Scorecard');
    lines.push('');
    lines.push('| Dimension | Signal | Metrics |');
    lines.push('|---|---|---|');
    for (const dim of scorecard.dimensions) {
        const metricsStr = dim.metrics
            .map(m => `${m.name}: ${m.formattedValue} ${signalEmoji(m.signal)}`)
            .join(' · ');
        lines.push(`| ${dim.name} | ${signalEmoji(dim.signal)} | ${metricsStr} |`);
    }
    lines.push('');

    // Agent steps
    lines.push('## Agent Steps');
    lines.push('');
    let usageEvent: AgentEvent | undefined;
    for (const event of agentEvents) {
        if (event.type === 'tool_use') {
            const input = event.input as Record<string, unknown>;
            lines.push(`### Iteration ${event.iteration} — ${event.toolName}`);
            lines.push('');
            lines.push('**Input:**');
            lines.push('```json');
            lines.push(JSON.stringify(input, null, 2));
            lines.push('```');
            lines.push('');
        } else if (event.type === 'tool_result') {
            lines.push('**Result:**');
            lines.push('```');
            lines.push(event.result);
            lines.push('```');
            lines.push('');
        } else if (event.type === 'usage') {
            usageEvent = event;
        }
    }

    // Token usage
    if (usageEvent && usageEvent.type === 'usage') {
        lines.push('## Token Usage');
        lines.push('');
        lines.push(`- Input: ${usageEvent.inputTokens.toLocaleString()}`);
        lines.push(`- Output: ${usageEvent.outputTokens.toLocaleString()}`);
        lines.push(`- Total: ${usageEvent.totalTokens.toLocaleString()}`);
        lines.push('');
    }

    return lines.join('\n');
}

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyzeIssuer(
    deps: IssuerAnalysisDeps,
    issuerName: string,
): Promise<IssuerAnalysisResult> {
    const { bedrockClient, tavilyClient } = deps;

    const webSearchTool = new WebSearchTool(tavilyClient);
    const stockwatchTool = new StockwatchTool();
    const biznesradarTool = new BiznesradarTool();
    const agentLoop = new AgentLoop(bedrockClient, MODEL_ID, [biznesradarTool, stockwatchTool, webSearchTool], 10);

    const agentEvents: AgentEvent[] = [];
    const rawAnswer = await agentLoop.run(buildTaskPrompt(issuerName), (event) => {
        agentEvents.push(event);
    });

    const agentFinancials = parseAgentFinancials(rawAnswer);

    const financialYears = agentFinancials.years.map(y => ({
        issuerName,
        year: y.year,
        revenue: y.revenue ?? undefined,
        ebit: y.ebit ?? undefined,
        depreciation: y.depreciation ?? undefined,
        interestExpense: y.interestExpense ?? undefined,
        netProfit: y.netProfit ?? undefined,
        totalAssets: y.totalAssets ?? undefined,
        intangibleAssets: y.intangibleAssets ?? undefined,
        equity: y.equity ?? undefined,
        financialDebt: y.financialDebt ?? undefined,
        cash: y.cash ?? undefined,
        currentAssets: y.currentAssets ?? undefined,
        inventory: y.inventory ?? undefined,
        currentLiabilities: y.currentLiabilities ?? undefined,
    }));

    const scorecard = computeScorecard(financialYears);
    const reportMarkdown = buildReportMarkdown(issuerName, agentFinancials, scorecard, agentEvents);

    return {
        issuerName,
        scorecard,
        agentFinancials,
        agentLog: agentEvents,
        reportMarkdown,
        modelId: MODEL_ID,
    };
}
