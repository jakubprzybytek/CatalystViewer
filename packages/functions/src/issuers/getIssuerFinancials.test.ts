import { describe, expect, it } from 'vitest';
import type { DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import { buildIssuerFinancials } from './getIssuerFinancials';

const row = (periodEnd: string, scope: 'single' | 'group', column: 'current' | 'previous', revenue: number): DbIssuerFinancialsRecord => ({
    entityId: '0000123456', period: `${periodEnd}#${scope}`, issuerName: 'Testowa S.A.', companyName: 'TESTOWA S.A.',
    scope, periodStart: `${periodEnd.slice(0, 4)}-01-01`, periodEnd, months: 12, currency: 'PLN',
    figures: { revenue: { value: revenue * 1_000_000, source: ['p. 4/Revenue'] }, netProfit: { value: 10_000_000, source: ['p. 4/Net profit'] } },
    column,
    filing: { key: `filings/0000123456/${periodEnd}.pdf`, sha256: 's', format: 'ai-pdf', schema: 'PDF read by m', checks: [], notes: ['n'], extraction: { model: 'm', promptVersion: 'v', pages: [4] } },
    importedAt: '2026-11-01T10:00:00.000Z',
});

describe('buildIssuerFinancials', () => {
    it('lists filed years newest first, in millions, with how each was read', () => {
        const view = buildIssuerFinancials('Testowa S.A.', [row('2024-12-31', 'group', 'previous', 90), row('2025-12-31', 'single', 'current', 50), row('2025-12-31', 'group', 'current', 100)], undefined);
        expect(view.filed.map(y => [y.periodEnd, y.scope, y.column])).toEqual([
            ['2025-12-31', 'group', 'current'], ['2025-12-31', 'single', 'current'], ['2024-12-31', 'group', 'previous'],
        ]);
        expect(view.filed[0]).toMatchObject({
            format: 'ai-pdf', extraction: { model: 'm', pages: [4] }, notes: ['n'], documentKey: 'filings/0000123456/2025-12-31.pdf',
            figures: { revenue: { value: 100, source: ['p. 4/Revenue'] }, netProfit: { value: 10 } },
        });
        expect(view.ai).toBeUndefined();
        expect(view.scorecardSource).toMatchObject({ kind: 'filing', scope: 'group', latestPeriodEnd: '2025-12-31' });
    });

    it('adds the AI-collected years, keeping only numbers', () => {
        const analysis = {
            issuerName: 'Testowa S.A.', performedAt: '2026-06-01T00:00:00.000Z', performedAtTs: 0,
            agentFinancials: { years: [{ year: '2023', revenue: '80.5', ebit: null, netProfit: true }, { year: 2024, revenue: 95, cash: 3 }] },
        };
        const view = buildIssuerFinancials('Testowa S.A.', [], analysis);
        expect(view.ai).toEqual({
            performedAt: '2026-06-01T00:00:00.000Z',
            years: [{ year: 2024, figures: { revenue: 95, cash: 3 } }, { year: 2023, figures: { revenue: 80.5 } }],
        });
        expect(view.scorecardSource).toEqual({ kind: 'ai', performedAt: '2026-06-01T00:00:00.000Z' });
    });
});
