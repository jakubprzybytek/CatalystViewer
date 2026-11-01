import { describe, expect, it } from 'vitest';
import type { FiledYear, IssuerFinancials } from '../../sdk/Issuers';
import { buildColumns, disagreement, valueOf } from './financialColumns';

const filed = (periodEnd: string, scope: 'single' | 'group', revenue: number, months = 12): FiledYear => ({
  periodEnd, periodStart: '', months, scope, currency: 'PLN', column: 'current', format: 'esef', schema: '', importedAt: '',
  checks: [], notes: [], documentKey: periodEnd, figures: { revenue: { value: revenue, source: ['ifrs-full:Revenue'] } },
});

describe('buildColumns', () => {
  it('joins filed and AI years, group accounts first, newest first', () => {
    const data: IssuerFinancials = {
      issuerName: 'X',
      filed: [filed('2025-12-31', 'group', 100), filed('2025-12-31', 'single', 60), filed('2024-12-31', 'single', 50), filed('2025-06-30', 'group', 40, 6)],
      ai: { performedAt: '', years: [{ year: 2024, figures: { revenue: 90 } }, { year: 2023, figures: { revenue: 80 } }] },
    };
    const columns = buildColumns(data);
    expect(columns.map(c => [c.year, c.filed?.scope, !!c.ai])).toEqual([[2025, 'group', false], [2024, undefined, true], [2023, undefined, true]]);
    expect(columns.map(c => valueOf(c, 'revenue'))).toEqual([100, 90, 80]);
  });

  it('flags an AI figure that differs from the filed one', () => {
    const column = { year: 2025, filed: filed('2025-12-31', 'group', 100), ai: { year: 2025, figures: { revenue: 110 } } };
    expect(disagreement(column, 'revenue')).toBe(110);
    expect(disagreement({ ...column, ai: { year: 2025, figures: { revenue: 101 } } }, 'revenue')).toBeUndefined();
  });
});
