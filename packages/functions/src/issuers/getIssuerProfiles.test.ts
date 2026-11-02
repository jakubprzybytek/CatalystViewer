import { describe, expect, it } from 'vitest';
import { currentScorecard, financialsCoverage, scorecardWithSource } from './getIssuerProfiles';
import type { DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';

const trendSignal = (scorecard: ReturnType<typeof currentScorecard>) =>
    scorecard?.dimensions.find(d => d.name === 'Financial Trend')?.signal;

describe('currentScorecard', () => {
    it('recomputes the scorecard from the stored figures', () => {
        // Arche S.A. was stored with Financial Trend 'yellow' although no trend metric was available
        const stored = {
            issuerName: 'Arche S.A.',
            performedAt: '2026-05-18T22:42:02.336Z',
            performedAtTs: 0,
            scorecard: { dimensions: [{ name: 'Financial Trend', signal: 'yellow' as const, metrics: [] }] },
            agentFinancials: {
                years: [
                    { year: 2024, revenue: 743.93, ebit: 136.22, netProfit: 95.77, equity: 699.6, cash: null },
                    { year: 2023, revenue: 731.04, equity: 604.43 },
                    { year: 2022, revenue: null },
                ],
            },
        };
        const scorecard = currentScorecard(stored);
        expect(trendSignal(scorecard)).toBe('na');
        expect(scorecard?.dimensions.find(d => d.name === 'Profitability')?.signal).toBe('green');
    });

    it('keeps the stored scorecard when there are no stored figures', () => {
        const scorecard = { dimensions: [] };
        expect(currentScorecard({ issuerName: 'X', performedAt: '', performedAtTs: 0, scorecard })).toBe(scorecard);
    });
});

describe('scorecardWithSource', () => {
    const analysis = {
        issuerName: 'Testowa S.A.',
        performedAt: '2026-10-01T10:00:00.000Z',
        performedAtTs: 0,
        agentFinancials: { years: [{ year: 2024, revenue: 100, ebit: 1, netProfit: 1 }] },
    };
    const filing: DbIssuerFinancialsRecord = {
        entityId: '0000123456', period: '2025-12-31#single', issuerName: 'Testowa S.A.', companyName: 'TESTOWA S.A.',
        scope: 'single', periodStart: '2025-01-01', periodEnd: '2025-12-31', months: 12, currency: 'PLN',
        figures: {
            revenue: { value: 800_000_000, source: ['RZiSPor/A'] },
            ebit: { value: 160_000_000, source: ['RZiSPor/F'] },
            netProfit: { value: 120_000_000, source: ['RZiSPor/L'] },
        },
        column: 'current', filing: { key: 'k', sha256: 's', format: 'krs-xml', schema: 'x', checks: [] }, importedAt: '',
    };
    const ebitMargin = (result: ReturnType<typeof scorecardWithSource>) => result.scorecard?.dimensions
        .find(d => d.name === 'Profitability')?.metrics.find(m => m.name === 'EBIT Margin')?.value;

    it('uses the filed statements over the AI analysis', () => {
        const result = scorecardWithSource('Testowa S.A.', [filing], analysis);
        expect(result.financialsSource).toEqual({ kind: 'filing', format: 'krs-xml', scope: 'single', latestPeriodEnd: '2025-12-31', years: 1 });
        expect(ebitMargin(result)).toBeCloseTo(0.2);
    });

    it('keeps the AI analysis when it has a later fiscal year than the filings', () => {
        const old = { ...filing, period: '2023-12-31#single', periodStart: '2023-01-01', periodEnd: '2023-12-31' };
        const result = scorecardWithSource('Testowa S.A.', [old], analysis);
        expect(result.financialsSource).toEqual({ kind: 'ai', performedAt: '2026-10-01T10:00:00.000Z' });
        expect(ebitMargin(result)).toBeCloseTo(0.01);
        // without an AI analysis, an old filing is still better than nothing
        expect(scorecardWithSource('Testowa S.A.', [old], undefined).financialsSource).toMatchObject({ kind: 'filing', latestPeriodEnd: '2023-12-31' });
    });

    it('falls back to the AI analysis without filed statements', () => {
        const result = scorecardWithSource('Testowa S.A.', [], analysis);
        expect(result.financialsSource).toEqual({ kind: 'ai', performedAt: '2026-10-01T10:00:00.000Z' });
        expect(ebitMargin(result)).toBeCloseTo(0.01);
    });

    it('has no scorecard without either', () => {
        expect(scorecardWithSource('Testowa S.A.', [], undefined)).toEqual({});
    });

    it('summarises what is collected, whatever the scorecard uses', () => {
        const previous = { ...filing, period: '2024-12-31#group', scope: 'group' as const, periodEnd: '2024-12-31', importedAt: '2026-11-01T10:00:00.000Z',
            filing: { ...filing.filing, format: 'esef' as const } };
        expect(financialsCoverage([filing, previous], analysis)).toEqual({
            filed: { latestPeriodEnd: '2025-12-31', earliestPeriodEnd: '2024-12-31', years: 2, formats: ['krs-xml', 'esef'], scopes: ['group', 'single'], lastImportedAt: '2026-11-01T10:00:00.000Z' },
            ai: { performedAt: '2026-10-01T10:00:00.000Z', latestYear: 2024, years: 1 },
            company: { name: 'TESTOWA S.A.' },
        });
        expect(financialsCoverage([], undefined)).toEqual({});
    });

    it('says where the company is registered', () => {
        expect(financialsCoverage([{ ...filing, krs: '0000123456', lei: '259400TESTOWA0000001' }], undefined).company)
            .toEqual({ name: 'TESTOWA S.A.', country: 'PL', krs: '0000123456', lei: '259400TESTOWA0000001' });
        expect(financialsCoverage([{ ...filing, entityId: 'LEI:213800OVMJPFP79OB449', lei: '213800OVMJPFP79OB449', registration: { country: 'NL', id: '81928491' } }], undefined).company)
            .toEqual({ name: 'TESTOWA S.A.', country: 'NL', lei: '213800OVMJPFP79OB449', registeredAs: '81928491' });
    });
});
