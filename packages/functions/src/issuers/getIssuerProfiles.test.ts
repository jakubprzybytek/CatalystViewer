import { describe, expect, it } from 'vitest';
import { buildIssuerProfiles, currentScorecard, financialsCoverage, scorecardWithSource } from './getIssuerProfiles';
import type { DbIssuerIdentityRecord } from '@core/storage/issuerProfiles';
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

    it('says how much the scorecard rests on', () => {
        const filed = scorecardWithSource('Testowa S.A.', [filing], undefined, 'general', '2026-11-03').scorecard?.confidence;
        expect(filed).toMatchObject({ source: 'filing', periodEnd: '2025-12-31', yearsBehind: 0, years: 1 });
        expect(filed?.facts[0]).toBe('KRS filing, single-company accounts, FY2025');
        const fromAi = scorecardWithSource('Testowa S.A.', [], analysis, 'general', '2026-11-03').scorecard?.confidence;
        expect(fromAi).toMatchObject({ source: 'ai', periodEnd: '2024-12-31', yearsBehind: 1 });
        expect(fromAi?.level).toBe('low');   // revenue, EBIT and net profit only
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

describe('buildIssuerProfiles with identities', () => {
    const profile = (issuerName: string, industry = 'Energy') => ({ issuerName, recordType: '#PROFILE' as const, industry, businessSummary: '', classifiedAt: '', classifiedAtTs: 0, modelId: 'm' });
    const identity = (issuerName: string, entityId: string, legalName: string, extra: Partial<DbIssuerIdentityRecord> = {}): DbIssuerIdentityRecord => ({
        issuerName, recordType: '#IDENTITY', entityId, legalName, country: 'PL', financialsEntityId: entityId, status: 'confirmed', source: 'isin', evidence: 'ISIN X', resolvedAt: '', ...extra,
    });
    const report = (entityId: string, issuerName: string, periodEnd: string): DbIssuerFinancialsRecord => ({
        entityId, period: `${periodEnd}#group`, issuerName, companyName: issuerName, scope: 'group', periodStart: `${periodEnd.slice(0, 4)}-01-01`, periodEnd, months: 12, currency: 'PLN',
        figures: { revenue: { value: 1e9, source: [] }, netProfit: { value: 1e8, source: [] }, totalAssets: { value: 2e9, source: [] }, equity: { value: 1e9, source: [] } },
        column: 'current', filing: { key: 'k', sha256: 's', format: 'esef', schema: 'ESEF', checks: [] }, importedAt: '2026-11-01T00:00:00Z',
    });
    const identities = [
        identity('Orlen S.A.', '0000028860', 'ORLEN SPÓŁKA AKCYJNA', { krs: '0000028860', lei: '259400VVMM70CQREJT74' }),
        identity('PKN Orlen S.A.', '0000028860', 'ORLEN SPÓŁKA AKCYJNA', { krs: '0000028860', source: 'manual' }),
        identity('Orlen Capital AB (publ)', 'LEI:259400MOAC94K67KZ966', 'Orlen Capital AB (publ)', { country: 'SE', register: { authority: 'RA000544', id: '556974-3114' }, financialsEntityId: '0000028860' }),
    ];
    const profiles = buildIssuerProfiles(
        [profile('Orlen S.A.'), profile('PKN Orlen S.A.'), profile('Orlen Capital AB (publ)'), profile('Testowa S.A.')],
        [], [report('0000028860', 'Orlen S.A.', '2025-12-31'), report('0000123456', 'Testowa S.A.', '2025-12-31')], identities,
    );
    const byName = new Map(profiles.map(p => [p.issuerName, p]));

    it("gives every name of a company the company's reports and its other names", () => {
        expect(byName.get('PKN Orlen S.A.')?.financialsSource).toMatchObject({ kind: 'filing', latestPeriodEnd: '2025-12-31' });
        expect(byName.get('Orlen S.A.')?.identity).toMatchObject({ entityId: '0000028860', otherNames: ['PKN Orlen S.A.'], cardName: 'Orlen S.A.' });
        expect(byName.get('PKN Orlen S.A.')?.identity?.cardName).toBe('Orlen S.A.');
        expect(byName.get('PKN Orlen S.A.')?.financialsCoverage.company).toEqual({ name: 'ORLEN SPÓŁKA AKCYJNA', country: 'PL', krs: '0000028860' });
    });

    it("gives a financing vehicle the group's reports, and says whose", () => {
        const capital = byName.get('Orlen Capital AB (publ)');
        expect(capital?.financialsSource).toMatchObject({ kind: 'filing' });
        expect(capital?.identity).toMatchObject({ country: 'SE', registeredAs: '556974-3114', otherNames: [], figuresFrom: 'ORLEN SPÓŁKA AKCYJNA' });
    });

    it("names a parent with no identity of its own as its reports do", () => {
        const pepco = buildIssuerProfiles([profile('Pepco Group NV', 'Retail')], [], [report('LEI:213800OVMJPFP79OB449', 'Pepco Group NV', '2025-09-30')],
            [identity('Pepco Group NV', 'LEI:213800G4WKC4TX8X3R23', 'PEU (FIN) PLC', { country: 'GB', financialsEntityId: 'LEI:213800OVMJPFP79OB449', status: 'review' })])[0];
        expect(pepco.identity?.figuresFrom).toBe('Pepco Group NV');
        expect(pepco.financialsSource).toMatchObject({ kind: 'filing', latestPeriodEnd: '2025-09-30' });
    });

    it('matches a name without an identity by name, as before', () => {
        expect(byName.get('Testowa S.A.')?.financialsSource).toMatchObject({ kind: 'filing' });
        expect(byName.get('Testowa S.A.')?.identity).toBeUndefined();
    });

    it("compares the bonds of all the names the group's report covers with its cash", () => {
        const bonds = [
            { issuer: 'Orlen S.A.', isin: 'PL1', name: 'ORL1127', currency: 'PLN', issueValue: 1e9, maturityDay: '2027-11-01' },
            { issuer: 'PKN Orlen S.A.', isin: 'PL2', name: 'PKN0628', currency: 'PLN', issueValue: 5e8, maturityDay: '2028-06-01' },
            { issuer: 'Orlen Capital AB (publ)', isin: 'XS3', name: 'ORC0327', currency: 'EUR', issueValue: 1e8, maturityDay: '2027-03-01' },
            { issuer: 'Testowa S.A.', isin: 'PL4', name: 'TES0127', currency: 'PLN', issueValue: 1e8, maturityDay: '2027-01-01' },
        ];
        const withCash = { ...report('0000028860', 'Orlen S.A.', '2025-12-31') };
        withCash.figures = { ...withCash.figures, cash: { value: 2e9, source: [] }, operatingCashFlow: { value: 1e9, source: [] } };
        const all = buildIssuerProfiles([profile('Orlen S.A.'), profile('Orlen Capital AB (publ)'), profile('Testowa S.A.', 'Finance')], [], [withCash, report('0000123456', 'Testowa S.A.', '2025-12-31')], identities,
            { bonds, rates: { EUR: 4 }, today: '2026-11-03' });
        const orlen = all[0];
        expect(orlen.refinancing?.bonds.map(b => b.name)).toEqual(['ORC0327', 'ORL1127', 'PKN0628']);
        expect(orlen.refinancing?.report).toMatchObject({ due12: 1.4e9, due24: 1.9e9, cash: 2e9 });
        expect(orlen.scorecard?.dimensions.at(-1)).toMatchObject({ name: 'Refinancing', signal: 'yellow' });
        expect(orlen.scorecard?.ruleSet).toBe('general');
        expect(buildIssuerProfiles([profile('Testowa S.A.', 'Developer')], [], [report('0000123456', 'Testowa S.A.', '2025-12-31')], [])[0].scorecard?.ruleSet).toBe('developer');
        expect(all[1].refinancing?.report?.due24).toBe(1.9e9);
        // A Finance issuer gets the schedule, without a scorecard
        expect(all[2].refinancing?.report?.due12).toBe(1e8);
        expect(all[2].scorecard).toBeUndefined();
    });
});
