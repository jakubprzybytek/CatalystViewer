import { describe, expect, it } from 'vitest';
import { reportPeriodEndOf, reportsNewerOrSame, type DbIssuerFinancialsRecord } from '.';

const row = (column: 'current' | 'previous', periodEnd: string, key: string, reportPeriodEnd?: string) =>
    ({ column, periodEnd, filing: { key }, ...(reportPeriodEnd ? { reportPeriodEnd } : {}) }) as DbIssuerFinancialsRecord;

describe('reportPeriodEndOf', () => {
    it('is the row\'s own year for a current row, the file\'s year for a comparative one', () => {
        expect(reportPeriodEndOf(row('current', '2024-12-31', 'filings/1/2024-12-31-group-abc.zip'))).toBe('2024-12-31');
        expect(reportPeriodEndOf(row('previous', '2024-12-31', 'filings/1/2025-12-31-group-abc.zip'))).toBe('2025-12-31');
        expect(reportPeriodEndOf(row('previous', '2023-09-30', 'filings/LEI-X/2024-09-30-group-abc.zip'))).toBe('2024-09-30');
        expect(reportPeriodEndOf(row('previous', '2024-12-31', 'whatever', '2025-12-31'))).toBe('2025-12-31');
    });
});

describe('reportsNewerOrSame', () => {
    const own2024 = row('current', '2024-12-31', 'filings/1/2024-12-31-single-a.xml');
    const from2025 = row('previous', '2024-12-31', 'filings/1/2025-12-31-single-b.xml');
    it('lets the more recent report win, and the same report overwrite', () => {
        expect(reportsNewerOrSame(from2025, own2024)).toBe(true);
        expect(reportsNewerOrSame(own2024, from2025)).toBe(false);
        expect(reportsNewerOrSame(own2024, own2024)).toBe(true);
        expect(reportsNewerOrSame(own2024, undefined)).toBe(true);
    });
});
