import type { DataConfidence } from './confidence';

export type Signal = 'green' | 'yellow' | 'red' | 'na';

export type FinancialYearData = {
  issuerName: string;
  year: number;
  revenue?: number;
  ebit?: number;
  depreciation?: number;
  interestExpense?: number;
  netProfit?: number;
  totalAssets?: number;
  intangibleAssets?: number;
  equity?: number;
  financialDebt?: number;
  cash?: number;
  currentAssets?: number;
  inventory?: number;
  currentLiabilities?: number;
  // From imported reports only (statement lines); the AI-collected figures don't have them
  operatingCashFlow?: number;
  capex?: number;              // paid, positive
  investmentProperty?: number;
  contractLiabilities?: number;  // customer and buyer advances
  leases?: number;             // lease liabilities, part of financialDebt
  interestPaid?: number;       // cash flow, positive
  writeDowns?: number;         // write-downs of non-financial assets in EBIT, not in depreciation
};

export type MetricResult = {
  name: string;
  value: number | null;
  formattedValue: string;
  signal: Signal;
  scored?: false;      // shown for context, not counted in the dimension's signal
};

export type DimensionResult = {
  name: string;
  signal: Signal;
  metrics: MetricResult[];
  notes?: string[];   // caveats shown with the metrics
};

export type FundamentalScorecard = {
  dimensions: DimensionResult[];
  ruleSet?: RuleSet;
  confidence?: DataConfidence;   // added by the API, from the figures' source
};

// ─── Rule sets ────────────────────────────────────────────────────────────────

// Which metrics and thresholds a company is judged by, from its industry (design: 2026-11-03-sector-rules-design.md).
export type RuleSet = 'general' | 'developer' | 'contractor' | 'consumer';

const RULE_SET_OF: Record<string, RuleSet> = {
  Developer: 'developer',
  Construction: 'contractor',
  Retail: 'consumer', Telecommunications: 'consumer', Media: 'consumer', Other: 'consumer',
};

// Issuers whose industry's rules don't fit their business model.
const RULE_SET_OVERRIDES: Record<string, RuleSet> = {
  // An IT distributor classified Retail: it holds stock on its own money, unlike a shop
  'AB S.A.': 'general',
};

export function ruleSetFor(industry: string | undefined, issuerName?: string): RuleSet {
  return (issuerName && RULE_SET_OVERRIDES[issuerName]) || (industry && RULE_SET_OF[industry]) || 'general';
}

// ─── Signal helpers ────────────────────────────────────────────────────────────

function signalFromValue(
  value: number | null | undefined,
  greenFn: (v: number) => boolean,
  yellowFn: (v: number) => boolean,
): Signal {
  if (value == null || !isFinite(value)) return 'na';
  if (greenFn(value)) return 'green';
  if (yellowFn(value)) return 'yellow';
  return 'red';
}

function div(a: number | undefined, b: number | undefined): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function pct(value: number | null): string {
  if (value == null) return 'n/a';
  return `${(value * 100).toFixed(1)}%`;
}

function mult(value: number | null, decimals = 2): string {
  if (value == null) return 'n/a';
  return `${value.toFixed(decimals)}×`;
}

// EBITDA and EBIT before write-downs of non-financial assets (a non-cash one-off, e.g. a goodwill write-down)
function ebitBeforeWriteDowns(year: FinancialYearData): number | undefined {
  return year.ebit == null ? undefined : year.ebit + Math.max(0, year.writeDowns ?? 0);
}
function ebitdaOf(year: FinancialYearData): number | undefined {
  const ebit = ebitBeforeWriteDowns(year);
  return ebit != null && year.depreciation != null ? ebit + year.depreciation : undefined;
}
function netDebtOf(year: FinancialYearData): number | undefined {
  return year.financialDebt != null && year.cash != null ? year.financialDebt - year.cash : undefined;
}
function writeDownNote(year: FinancialYearData): string[] {
  return year.writeDowns != null && year.writeDowns > 0
    ? [`EBIT and EBITDA before a ${year.writeDowns.toLocaleString('en-US', { maximumFractionDigits: 0 })} m write-down of non-financial assets`]
    : [];
}

const metric = (name: string, value: number | null, formattedValue: string, signal: Signal): MetricResult => ({ name, value, formattedValue, signal });
const shown = (name: string, value: number | null, formattedValue: string): MetricResult => ({ name, value, formattedValue, signal: 'na', scored: false });
const dimension = (name: string, metrics: MetricResult[], notes: string[] = []): DimensionResult => ({
  name, signal: worstSignal(metrics.filter(m => m.scored !== false)), metrics, ...(notes.length ? { notes } : {}),
});
const lower = (green: number, yellow: number) => (v: number | null) => signalFromValue(v, x => x < green, x => x <= yellow);
const higher = (green: number, yellow: number) => (v: number | null) => signalFromValue(v, x => x > green, x => x >= yellow);

// ─── Dimension 1 — Debt Burden ────────────────────────────────────────────────

function deMetric(year: FinancialYearData, name = 'D/E', green = 1.0, yellow = 2.0, debt = year.financialDebt): MetricResult {
  const de = div(debt, year.equity);
  // Negative equity means the company owes more than it owns — always red
  const signal: Signal = de == null ? 'na' : year.equity != null && year.equity <= 0 ? 'red' : lower(green, yellow)(de);
  return metric(name, de, mult(de), signal);
}

function ndEbitdaMetric(year: FinancialYearData, name: string, green: number, yellow: number, netDebt = netDebtOf(year)): MetricResult {
  const ebitda = ebitdaOf(year);
  const value = div(netDebt, ebitda);
  // Negative EBITDA means no operating cash generation — always red
  const signal: Signal = value == null ? 'na' : ebitda != null && ebitda <= 0 ? 'red' : lower(green, yellow)(value);
  return metric(name, value, mult(value), signal);
}

function computeDebtBurden(year: FinancialYearData, rules: RuleSet): DimensionResult {
  const notes = writeDownNote(year);
  if (rules === 'developer') {
    const netDebt = netDebtOf(year);
    const stock = year.inventory != null ? year.inventory + (year.investmentProperty ?? 0) : undefined;
    const ndStock = div(netDebt, stock);
    return dimension('Debt Burden', [
      metric('Net Debt/(Inventory + Investment Property)', ndStock, mult(ndStock), lower(0.3, 0.6)(ndStock)),
      deMetric(year, 'Net Debt/Equity', 0.5, 1.0, netDebt),
    ]);
  }
  if (rules === 'consumer') {
    const netDebt = netDebtOf(year);
    const exLeases = netDebt != null && year.leases != null ? netDebt - year.leases : undefined;
    const exLeasesRatio = div(exLeases, ebitdaOf(year));
    const fcf = year.operatingCashFlow != null && year.capex != null ? year.operatingCashFlow - Math.abs(year.capex) : undefined;
    const fcfToDebt = netDebt != null && netDebt <= 0 && fcf != null ? null : div(fcf, netDebt);
    const fcfSignal: Signal = netDebt != null && netDebt <= 0 && fcf != null ? 'green' : higher(0.15, 0.05)(fcfToDebt);
    return dimension('Debt Burden', [
      ndEbitdaMetric(year, 'Net Debt incl. Leases/EBITDA', 3.0, 4.5),
      shown('Net Debt excl. Leases/EBITDA', exLeasesRatio, mult(exLeasesRatio)),
      metric('Free Cash Flow/Net Debt', fcfToDebt, netDebt != null && netDebt <= 0 && fcf != null ? 'net cash' : pct(fcfToDebt), fcfSignal),
    ], notes);
  }
  return dimension('Debt Burden', [deMetric(year), ndEbitdaMetric(year, 'Net Debt/EBITDA', 2.5, 4.0)], notes);
}

// ─── Dimension 2 — Debt Service ───────────────────────────────────────────────

function computeDebtService(year: FinancialYearData, rules: RuleSet): DimensionResult {
  // Developers add interest to the cost of the flats: the interest paid is what they owe
  const paid = rules === 'developer' && year.interestPaid != null && year.interestPaid > 0;
  const icr = div(ebitBeforeWriteDowns(year), paid ? year.interestPaid : year.interestExpense);
  return dimension('Debt Service', [metric(paid ? 'ICR (interest paid)' : 'ICR', icr, mult(icr), higher(3.0, 1.5)(icr))], writeDownNote(year));
}

// ─── Dimension 3 — Liquidity ──────────────────────────────────────────────────

function computeLiquidity(year: FinancialYearData, rules: RuleSet): DimensionResult {
  const cr = div(year.currentAssets, year.currentLiabilities);
  const crMetric = (green: number, yellow: number) => metric('Current Ratio', cr, mult(cr), higher(green, yellow)(cr));
  if (rules === 'developer') {
    const presales = div(year.contractLiabilities, year.inventory);
    return dimension('Liquidity', [crMetric(2.0, 1.3), shown('Buyer Advances/Inventory', presales, pct(presales))]);
  }
  if (rules === 'contractor') {
    const netOfAdvances = year.cash != null && year.contractLiabilities != null ? div(year.cash - year.contractLiabilities, year.revenue) : null;
    return dimension('Liquidity', [crMetric(1.2, 1.0), metric('Cash net of Advances/Revenue', netOfAdvances, pct(netOfAdvances), signalFromValue(netOfAdvances, v => v > 0.05, v => v >= 0))]);
  }
  if (rules === 'consumer') {
    const ocfCl = div(year.operatingCashFlow, year.currentLiabilities);
    return dimension('Liquidity', [metric('Operating Cash Flow/Current Liabilities', ocfCl, mult(ocfCl), higher(0.5, 0.3)(ocfCl)), shown('Current Ratio', cr, mult(cr))]);
  }
  return dimension('Liquidity', [crMetric(1.5, 1.0)]);
}

// ─── Dimension 4 — Profitability ──────────────────────────────────────────────

const MARGINS: Record<RuleSet, { ebit: [number, number]; net: [number, number] }> = {
  general: { ebit: [0.10, 0.05], net: [0.05, 0.01] },
  consumer: { ebit: [0.10, 0.05], net: [0.05, 0.01] },
  developer: { ebit: [0.15, 0.08], net: [0.10, 0.05] },
  contractor: { ebit: [0.04, 0.02], net: [0.025, 0.005] },
};

function computeProfitability(year: FinancialYearData, rules: RuleSet): DimensionResult {
  const ebitMargin = div(year.ebit, year.revenue);
  const netMargin = div(year.netProfit, year.revenue);
  const { ebit, net } = MARGINS[rules];
  return dimension('Profitability', [
    metric('EBIT Margin', ebitMargin, pct(ebitMargin), higher(...ebit)(ebitMargin)),
    metric('Net Margin', netMargin, pct(netMargin), higher(...net)(netMargin)),
  ]);
}

// ─── Dimension 5 — Asset Coverage ────────────────────────────────────────────

const EQUITY_RATIO: Record<RuleSet, [number, number]> = {
  general: [0.30, 0.15], contractor: [0.30, 0.15], developer: [0.35, 0.25], consumer: [0.20, 0.10],
};

function computeAssetCoverage(year: FinancialYearData, rules: RuleSet): DimensionResult {
  const tangibleNetAssets =
    year.totalAssets != null && year.intangibleAssets != null && year.currentLiabilities != null
      ? year.totalAssets - year.intangibleAssets - year.currentLiabilities
      : undefined;
  const acr = div(tangibleNetAssets, year.financialDebt);
  const equityRatio = div(year.equity, year.totalAssets);
  return dimension('Asset Coverage', [
    rules === 'consumer' ? shown('Asset Coverage Ratio', acr, mult(acr)) : metric('Asset Coverage Ratio', acr, mult(acr), higher(1.5, 1.0)(acr)),
    metric('Equity Ratio', equityRatio, pct(equityRatio), higher(...EQUITY_RATIO[rules])(equityRatio)),
  ]);
}

// ─── Dimension 6 — Financial Trend ───────────────────────────────────────────

function cagr(oldest: number, newest: number, periods: number): number | null {
  if (oldest <= 0 || periods === 0) return null;
  return Math.pow(newest / oldest, 1 / periods) - 1;
}

function linearSlope(values: number[]): number {
  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function computeTrend(years: FinancialYearData[]): DimensionResult {
  if (years.length < 3) {
    const naMetric = (name: string): MetricResult => ({ name, value: null, formattedValue: 'n/a', signal: 'na' });
    const metrics = [naMetric('Revenue CAGR'), naMetric('EBITDA Margin Trend'), naMetric('Net Debt/EBITDA Trend')];
    return { name: 'Financial Trend', signal: 'na', metrics };
  }

  // years sorted descending by year (newest first)
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const newest = sorted[0];
  const oldest = sorted[sorted.length - 1];
  const periods = sorted.length - 1;

  // Revenue CAGR
  const revCagrValue = newest.revenue != null && oldest.revenue != null
    ? cagr(oldest.revenue, newest.revenue, periods)
    : null;
  const revCagrMetric: MetricResult = {
    name: 'Revenue CAGR',
    value: revCagrValue,
    formattedValue: pct(revCagrValue),
    signal: signalFromValue(revCagrValue, v => v > 0.05, v => v >= 0),
  };

  // EBITDA Margin Trend (slope of EBITDA/revenue across years, sorted ascending)
  const ebitdaMargins = sorted
    .slice()
    .reverse() // oldest first for slope
    .map(y => {
      const ebitda = ebitdaOf(y);
      return ebitda != null && y.revenue != null && y.revenue > 0 ? ebitda / y.revenue : null;
    })
    .filter((v): v is number => v !== null);

  let ebitdaMarginSignal: Signal = 'na';
  let ebitdaSlopeValue: number | null = null;
  if (ebitdaMargins.length >= 3) {
    ebitdaSlopeValue = linearSlope(ebitdaMargins);
    const latestMargin = ebitdaMargins[ebitdaMargins.length - 1];
    const isImproving = ebitdaSlopeValue > 0;
    const isStableHigh = Math.abs(ebitdaSlopeValue) <= 0.005 && latestMargin > 0.10;
    if (isImproving || isStableHigh) ebitdaMarginSignal = 'green';
    else if (ebitdaSlopeValue >= -0.005) ebitdaMarginSignal = 'yellow';
    else ebitdaMarginSignal = 'red';
  }
  const ebitdaMarginMetric: MetricResult = {
    name: 'EBITDA Margin Trend',
    value: ebitdaSlopeValue,
    formattedValue: ebitdaSlopeValue != null ? `slope ${ebitdaSlopeValue.toFixed(3)}` : 'n/a',
    signal: ebitdaMarginSignal,
  };

  // Net Debt/EBITDA Trend (slope ascending = worsening if positive)
  const ndEbitdaSeries = sorted
    .slice()
    .reverse() // oldest first
    .map(y => {
      const ebitda = ebitdaOf(y) ?? null;
      const nd = netDebtOf(y) ?? null;
      return ebitda != null && nd != null && ebitda > 0 ? nd / ebitda : null;
    })
    .filter((v): v is number => v !== null);

  let ndEbitdaTrendSignal: Signal = 'na';
  let ndEbitdaSlopeValue: number | null = null;
  if (ndEbitdaSeries.length >= 3) {
    ndEbitdaSlopeValue = linearSlope(ndEbitdaSeries);
    // declining (negative slope) = good
    if (ndEbitdaSlopeValue < -0.1) ndEbitdaTrendSignal = 'green';
    else if (ndEbitdaSlopeValue <= 0.1) ndEbitdaTrendSignal = 'yellow';
    else ndEbitdaTrendSignal = 'red';
  }
  const ndEbitdaTrendMetric: MetricResult = {
    name: 'Net Debt/EBITDA Trend',
    value: ndEbitdaSlopeValue,
    formattedValue: ndEbitdaSlopeValue != null ? `slope ${ndEbitdaSlopeValue.toFixed(3)}` : 'n/a',
    signal: ndEbitdaTrendSignal,
  };

  const metrics = [revCagrMetric, ebitdaMarginMetric, ndEbitdaTrendMetric];
  // Trend signal, over the metrics that could be computed: n/a if none, red if ≥2 red,
  // green if all are green and there are at least two of them, yellow otherwise.
  const available = metrics.filter(m => m.signal !== 'na');
  const redCount = available.filter(m => m.signal === 'red').length;
  const greenCount = available.filter(m => m.signal === 'green').length;
  const trendSignal: Signal =
    available.length === 0 ? 'na'
    : redCount >= 2 ? 'red'
    : greenCount === available.length && available.length >= 2 ? 'green'
    : 'yellow';

  return { name: 'Financial Trend', signal: trendSignal, metrics };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SIGNAL_RANK: Record<Signal, number> = { red: 3, yellow: 2, green: 1, na: 0 };

function worstSignal(metrics: MetricResult[]): Signal {
  return metrics.reduce<Signal>((worst, m) =>
    SIGNAL_RANK[m.signal] > SIGNAL_RANK[worst] ? m.signal : worst,
    'na'
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function computeScorecard(years: FinancialYearData[], rules: RuleSet = 'general'): FundamentalScorecard {
  if (years.length === 0) {
    return { dimensions: [], ruleSet: rules };
  }

  // Use most recent year for snapshot dimensions
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const current = sorted[0];

  const dimensions: DimensionResult[] = [
    computeDebtBurden(current, rules),
    computeDebtService(current, rules),
    computeLiquidity(current, rules),
    computeProfitability(current, rules),
    computeAssetCoverage(current, rules),
    computeTrend(sorted),
  ];

  return { dimensions, ruleSet: rules };
}

// Scorecard from figures as the analysis agent reports them (null = not found).
// Stored analyses keep these figures, so scorecards can be recomputed when the rules change.
export type ReportedYear = { year: number } & {
  [K in Exclude<keyof FinancialYearData, 'issuerName' | 'year'>]?: number | null;
};

export function scorecardFromReportedYears(issuerName: string, years: ReportedYear[], rules: RuleSet = 'general'): FundamentalScorecard {
  return computeScorecard(years.map(y => {
    const data: FinancialYearData = { issuerName, year: y.year };
    for (const [key, value] of Object.entries(y)) {
      if (key !== 'year' && typeof value === 'number') {
        (data as Record<string, unknown>)[key] = value;
      }
    }
    return data;
  }), rules);
}
