import type { AiYear, FiledYear, FinancialField, IssuerFinancials } from '../../sdk/Issuers';

export const MAX_YEARS = 6;

// One fiscal year in the Financials view: the filed figures and the AI-collected ones for that year.
export type FinancialsColumn = { year: number; filed?: FiledYear; ai?: AiYear };

// Group accounts if the issuer has any (as the scorecard), full years only, newest first.
export function buildColumns(data: IssuerFinancials): FinancialsColumn[] {
  const scope = data.filed.some(y => y.scope === 'group') ? 'group' : 'single';
  const filed = new Map(data.filed.filter(y => y.scope === scope && y.months === 12).map(y => [Number(y.periodEnd.slice(0, 4)), y]));
  const ai = new Map((data.ai?.years ?? []).map(y => [y.year, y]));
  const years = [...new Set([...filed.keys(), ...ai.keys()])].sort((a, b) => b - a).slice(0, MAX_YEARS);
  return years.map(year => ({ year, filed: filed.get(year), ai: ai.get(year) }));
}

// The filed figure when the year has a report, else the AI one.
export function valueOf(column: FinancialsColumn, field: FinancialField): number | undefined {
  return column.filed ? column.filed.figures[field]?.value : column.ai?.figures[field];
}

// The AI figure, when it differs from the filed one by more than 2%.
export function disagreement(column: FinancialsColumn, field: FinancialField): number | undefined {
  const filed = column.filed?.figures[field]?.value;
  const ai = column.ai?.figures[field];
  if (filed === undefined || ai === undefined) return undefined;
  const scale = Math.max(Math.abs(filed), Math.abs(ai), 1e-9);
  return Math.abs(filed - ai) / scale > 0.02 ? ai : undefined;
}
