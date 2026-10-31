import { describe, expect, it } from 'vitest';
import type { DbIssuerFinancialsRecord } from '../../../storage/issuerFinancials';
import { filedYears } from './filedYears';

function row(periodEnd: string, scope: 'single' | 'group', revenue: number, months = 12): DbIssuerFinancialsRecord {
    return {
        entityId: '0000123456', period: `${periodEnd}#${scope}`, issuerName: 'Testowa S.A.', companyName: 'TESTOWA S.A.',
        scope, periodStart: '', periodEnd, months, currency: 'PLN',
        figures: { revenue: { value: revenue, source: ['RZiSPor/A'] } },
        column: 'current', filing: { key: 'k', sha256: 's', format: 'krs-xml', schema: 'x', checks: [] }, importedAt: '',
    };
}

describe('filedYears', () => {
    it('is undefined without full-year rows', () => {
        expect(filedYears([])).toBeUndefined();
        expect(filedYears([row('2025-06-30', 'single', 1, 6)])).toBeUndefined();
    });

    it('prefers group accounts and converts PLN to millions, newest first', () => {
        const result = filedYears([
            row('2024-12-31', 'single', 9_000_000),
            row('2024-12-31', 'group', 12_000_000),
            row('2025-12-31', 'group', 15_500_000),
        ]);
        expect(result?.scope).toBe('group');
        expect(result?.latestPeriodEnd).toBe('2025-12-31');
        expect(result?.years.map(y => [y.year, y.revenue, y.ebit])).toEqual([[2025, 15.5, null], [2024, 12, null]]);
    });

    it('uses single-company accounts when there are no group ones, at most five years', () => {
        const rows = [2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => row(`${y}-12-31`, 'single', y));
        const result = filedYears(rows);
        expect(result?.scope).toBe('single');
        expect(result?.years.map(y => y.year)).toEqual([2025, 2024, 2023, 2022, 2021]);
    });
});
