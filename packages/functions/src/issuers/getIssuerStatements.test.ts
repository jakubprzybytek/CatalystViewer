import { describe, expect, it } from 'vitest';
import type { DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import { buildIssuerStatements } from './getIssuerStatements';

const row: DbIssuerFinancialsRecord = {
    entityId: '0000123456', period: '2025-12-31#group', issuerName: 'Testowa S.A.', companyName: 'TESTOWA S.A.',
    scope: 'group', periodStart: '2025-01-01', periodEnd: '2025-12-31', months: 12, currency: 'PLN',
    standard: 'ifrs', presentedUnit: 1000, lineSigns: 'printed', review: { status: 'hand-checked' },
    figures: {},
    lines: [
        { statement: 'cashFlow', order: 0, label: 'Przepływy z działalności operacyjnej', value: 5_000 },
        { statement: 'income', order: 1, label: 'Zysk netto', value: 7_000, item: 'netProfit' },
        { statement: 'balance', order: 1, label: 'Aktywa razem', value: 10_000, item: 'totalAssets' },
        { statement: 'income', order: 0, label: 'Przychody', value: 9_000, item: 'revenue' },
        { statement: 'balance', order: 0, label: 'Zapasy', value: 10_000, parent: 1 },
    ],
    column: 'current',
    filing: { key: 'filings/x.pdf', sha256: 's', format: 'ai-pdf', schema: 'PDF', checks: [], extraction: { model: 'm', promptVersion: 'v4', pages: [4] } },
    linesExtraction: { model: 'm', promptVersion: 'v6', pages: [4, 5] },
    importedAt: '2026-11-01T10:00:00.000Z',
};

describe('buildIssuerStatements', () => {
    it('returns the year with its lines in statement order, and the model read the lines came from', () => {
        const view = buildIssuerStatements(row);
        expect(view).toMatchObject({ issuerName: 'Testowa S.A.', periodEnd: '2025-12-31', scope: 'group', format: 'ai-pdf', presentedUnit: 1000, lineSigns: 'printed', review: { status: 'hand-checked' } });
        expect(view.extraction?.promptVersion).toBe('v6');
        expect(view.lines.map(l => l.label)).toEqual(['Zapasy', 'Aktywa razem', 'Przychody', 'Zysk netto', 'Przepływy z działalności operacyjnej']);
    });

    it('has no lines for a year imported before lines were stored', () => {
        const { lines, standard, presentedUnit, lineSigns, review, linesExtraction, ...old } = row;
        const view = buildIssuerStatements(old as DbIssuerFinancialsRecord);
        expect(view.lines).toEqual([]);
        expect(view.presentedUnit).toBe(1);
        expect(view.extraction?.promptVersion).toBe('v4');
    });
});
