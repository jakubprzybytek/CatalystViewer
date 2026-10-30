import { describe, expect, it } from 'vitest';
import { currentScorecard } from './getIssuerProfiles';

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
