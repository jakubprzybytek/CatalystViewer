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
};

export type MetricResult = {
  name: string;
  value: number | null;
  formattedValue: string;
  signal: Signal;
};

export type DimensionResult = {
  name: string;
  signal: Signal;
  metrics: MetricResult[];
};

export type FundamentalScorecard = {
  dimensions: DimensionResult[];
};

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

// ─── Dimension 1 — Debt Burden ────────────────────────────────────────────────

function computeDebtBurden(year: FinancialYearData): DimensionResult {
  const de = div(year.financialDebt, year.equity);
  const ebitda = year.ebit != null && year.depreciation != null
    ? year.ebit + year.depreciation
    : undefined;
  const netDebt = year.financialDebt != null && year.cash != null
    ? year.financialDebt - year.cash
    : undefined;
  const ndEbitda = div(netDebt, ebitda);

  // Negative equity means the company owes more than it owns — always red
  const deSignal: Signal =
    de == null ? 'na'
    : year.equity != null && year.equity <= 0 ? 'red'
    : signalFromValue(de, v => v < 1.0, v => v <= 2.0);

  const deMetric: MetricResult = {
    name: 'D/E',
    value: de,
    formattedValue: mult(de),
    signal: deSignal,
  };

  // Negative EBITDA means no operating cash generation — always red
  const ndEbitdaSignal: Signal =
    ndEbitda == null ? 'na'
    : ebitda != null && ebitda <= 0 ? 'red'
    : signalFromValue(ndEbitda, v => v < 2.5, v => v <= 4.0);

  const ndMetric: MetricResult = {
    name: 'Net Debt/EBITDA',
    value: ndEbitda,
    formattedValue: mult(ndEbitda),
    signal: ndEbitdaSignal,
  };

  const metrics = [deMetric, ndMetric];
  return { name: 'Debt Burden', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 2 — Debt Service ───────────────────────────────────────────────

function computeDebtService(year: FinancialYearData): DimensionResult {
  const icr = div(year.ebit, year.interestExpense);

  const icrMetric: MetricResult = {
    name: 'ICR',
    value: icr,
    formattedValue: mult(icr),
    signal: signalFromValue(icr, v => v > 3.0, v => v >= 1.5),
  };

  return { name: 'Debt Service', signal: worstSignal([icrMetric]), metrics: [icrMetric] };
}

// ─── Dimension 3 — Liquidity ──────────────────────────────────────────────────

function computeLiquidity(year: FinancialYearData): DimensionResult {
  const cr = div(year.currentAssets, year.currentLiabilities);
  const liquidAssets = year.currentAssets != null && year.inventory != null
    ? year.currentAssets - year.inventory
    : undefined;
  const qr = div(liquidAssets, year.currentLiabilities);

  const crMetric: MetricResult = {
    name: 'Current Ratio',
    value: cr,
    formattedValue: mult(cr),
    signal: signalFromValue(cr, v => v > 1.5, v => v >= 1.0),
  };
  const qrMetric: MetricResult = {
    name: 'Quick Ratio',
    value: qr,
    formattedValue: mult(qr),
    signal: signalFromValue(qr, v => v > 1.2, v => v >= 0.8),
  };

  const metrics = [crMetric, qrMetric];
  return { name: 'Liquidity', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 4 — Profitability ──────────────────────────────────────────────

function computeProfitability(year: FinancialYearData): DimensionResult {
  const ebitMargin = div(year.ebit, year.revenue);
  const netMargin = div(year.netProfit, year.revenue);

  const emMetric: MetricResult = {
    name: 'EBIT Margin',
    value: ebitMargin,
    formattedValue: pct(ebitMargin),
    signal: signalFromValue(ebitMargin, v => v > 0.10, v => v >= 0.05),
  };
  const nmMetric: MetricResult = {
    name: 'Net Margin',
    value: netMargin,
    formattedValue: pct(netMargin),
    signal: signalFromValue(netMargin, v => v > 0.05, v => v >= 0.01),
  };

  const metrics = [emMetric, nmMetric];
  return { name: 'Profitability', signal: worstSignal(metrics), metrics };
}

// ─── Dimension 5 — Asset Coverage ────────────────────────────────────────────

function computeAssetCoverage(year: FinancialYearData): DimensionResult {
  const tangibleNetAssets =
    year.totalAssets != null && year.intangibleAssets != null && year.currentLiabilities != null
      ? year.totalAssets - year.intangibleAssets - year.currentLiabilities
      : undefined;
  const acr = div(tangibleNetAssets, year.financialDebt);
  const equityRatio = div(year.equity, year.totalAssets);

  const acrMetric: MetricResult = {
    name: 'Asset Coverage Ratio',
    value: acr,
    formattedValue: mult(acr),
    signal: signalFromValue(acr, v => v > 1.5, v => v >= 1.0),
  };
  const erMetric: MetricResult = {
    name: 'Equity Ratio',
    value: equityRatio,
    formattedValue: pct(equityRatio),
    signal: signalFromValue(equityRatio, v => v > 0.30, v => v >= 0.15),
  };

  const metrics = [acrMetric, erMetric];
  return { name: 'Asset Coverage', signal: worstSignal(metrics), metrics };
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
    .map(y => y.ebit != null && y.depreciation != null && y.revenue != null && y.revenue > 0
      ? (y.ebit + y.depreciation) / y.revenue
      : null)
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
      const ebitda = y.ebit != null && y.depreciation != null ? y.ebit + y.depreciation : null;
      const nd = y.financialDebt != null && y.cash != null ? y.financialDebt - y.cash : null;
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
  // Trend signal: green if all green, red if ≥2 red, yellow otherwise
  const redCount = metrics.filter(m => m.signal === 'red').length;
  const greenCount = metrics.filter(m => m.signal === 'green').length;
  const trendSignal: Signal = redCount >= 2 ? 'red' : greenCount === metrics.length ? 'green' : 'yellow';

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

export function computeScorecard(years: FinancialYearData[]): FundamentalScorecard {
  if (years.length === 0) {
    return { dimensions: [] };
  }

  // Use most recent year for snapshot dimensions
  const sorted = [...years].sort((a, b) => b.year - a.year);
  const current = sorted[0];

  const dimensions: DimensionResult[] = [
    computeDebtBurden(current),
    computeDebtService(current),
    computeLiquidity(current),
    computeProfitability(current),
    computeAssetCoverage(current),
    computeTrend(sorted),
  ];

  return { dimensions };
}
