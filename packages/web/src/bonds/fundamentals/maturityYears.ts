import type { ScheduledBond } from '@core/bonds/fundamentals/maturities';

// Bonds by year of maturity; the total in the report's currency (undefined when no bond of the year could be converted).
export function maturityYears(bonds: ScheduledBond[]): { year: string; bonds: ScheduledBond[]; total?: number }[] {
  return [...Map.groupBy(bonds, b => b.maturityDay.slice(0, 4))].map(([year, list]) => {
    const converted = list.filter(b => b.inReportCurrency !== undefined);
    return { year, bonds: list, ...(converted.length ? { total: converted.reduce((s, b) => s + b.inReportCurrency!, 0) } : {}) };
  });
}
