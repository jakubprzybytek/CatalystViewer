import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable, DbIssuerAnalysisSummary, type DbIssuerIdentityRecord } from '@core/storage/issuerProfiles';
import { reportsOf } from '@core/bonds/issuers/identity';
import { IssuerFinancialsTable, type DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import { ruleSetFor, scorecardFromReportedYears, type FundamentalScorecard, type ReportedYear, type RuleSet } from '@core/bonds/fundamentals/scorecard';
import { filedYears } from '@core/bonds/fundamentals/filings/filedYears';
import { isInFundamentalScope } from '@core/bonds/fundamentals/scope';
import { latestReport, refinancing, refinancingDimension, type ListedBond, type Rates } from '@core/bonds/fundamentals/maturities';
import { nbpRates } from '@core/bonds/fx/nbp';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});
const rates = nbpRates();

// Recomputed from the stored figures, so fixes to the scoring rules reach existing analyses
// without new (paid) runs. Falls back to the stored scorecard for records without figures.
export function currentScorecard(summary: DbIssuerAnalysisSummary, rules: RuleSet = 'general'): FundamentalScorecard | undefined {
    const years = (summary.agentFinancials as { years?: unknown } | undefined)?.years;
    if (Array.isArray(years)) {
        return scorecardFromReportedYears(summary.issuerName, years as ReportedYear[], rules);
    }
    return summary.scorecard;
}

// Where the scorecard's figures come from: the issuer's filed statements (KRS XML, ESEF or IFRS report)
// or the AI analysis.
export type FinancialsSource =
    | { kind: 'filing'; format: 'krs-xml' | 'esef' | 'ifrs-text' | 'ai-pdf'; scope: 'single' | 'group'; latestPeriodEnd: string; years: number }
    | { kind: 'ai'; performedAt: string };

// The latest fiscal year in the AI-collected figures, if any.
function latestAiYear(analysis: DbIssuerAnalysisSummary | undefined): number | undefined {
    const years = (analysis?.agentFinancials as { years?: { year?: unknown }[] } | undefined)?.years;
    const numbers = (Array.isArray(years) ? years : []).map(y => Number(y.year)).filter(Number.isFinite);
    return numbers.length ? Math.max(...numbers) : undefined;
}

// Filed statements win over the AI-collected figures (they're read in code from the official document),
// unless the AI analysis has a later fiscal year: an old filing must not replace newer figures.
export function scorecardWithSource(
    issuerName: string,
    filings: DbIssuerFinancialsRecord[],
    analysis: DbIssuerAnalysisSummary | undefined,
    rules: RuleSet = 'general',
): { scorecard?: FundamentalScorecard; financialsSource?: FinancialsSource } {
    const filed = filedYears(filings);
    const aiYear = latestAiYear(analysis);
    if (filed && (aiYear === undefined || Number(filed.latestPeriodEnd.slice(0, 4)) >= aiYear)) {
        return {
            scorecard: scorecardFromReportedYears(issuerName, filed.years, rules),
            financialsSource: { kind: 'filing', format: filed.format, scope: filed.scope, latestPeriodEnd: filed.latestPeriodEnd, years: filed.years.length },
        };
    }
    if (analysis) {
        return { scorecard: currentScorecard(analysis, rules), financialsSource: { kind: 'ai', performedAt: analysis.performedAt } };
    }
    return {};
}

// What's collected for an issuer, whatever the scorecard uses: imported reports (both scopes, any
// period length) and the AI analysis's years. For the Financials page.
export type FinancialsCoverage = {
    // the company of the latest imported report: where it's registered and its identifiers
    company?: { name: string; country?: string; krs?: string; lei?: string; registeredAs?: string };
    filed?: { latestPeriodEnd: string; earliestPeriodEnd: string; years: number; formats: DbIssuerFinancialsRecord['filing']['format'][]; scopes: ('single' | 'group')[]; lastImportedAt: string };
    ai?: { performedAt: string; latestYear?: number; years: number };
};

// Who an issuer name is (DbIssuerIdentityRecord), with the other names of the same company.
export type IssuerIdentityView = {
    entityId: string;
    legalName: string;
    country: string;
    lei?: string;
    krs?: string;
    registeredAs?: string;          // local register number outside the KRS
    category?: string;
    leiStatus?: string;
    status: 'confirmed' | 'review';
    note?: string;
    otherNames: string[];           // bond names of the same company
    cardName: string;               // the name the company is shown under: one card for all its names
    figuresFrom?: string;           // the company whose reports are used, when not this one (a financing vehicle)
};

// Of a company's names, the one to show it under: matched in the LEI register and confirmed, before a
// name set by hand or under review (a former name); then alphabetical.
const cardRank = (i: DbIssuerIdentityRecord) => (i.status === 'confirmed' ? 0 : 2) + (i.source === 'manual' ? 1 : 0);

export function identityView(identity: DbIssuerIdentityRecord, all: DbIssuerIdentityRecord[], reportNames: Map<string, string> = new Map()): IssuerIdentityView {
    const company = all.filter(i => i.entityId === identity.entityId);
    const cardName = [...company].sort((a, b) => cardRank(a) - cardRank(b) || a.issuerName.localeCompare(b.issuerName))[0].issuerName;
    const figuresFrom = identity.financialsEntityId !== identity.entityId
        ? all.find(i => i.entityId === identity.financialsEntityId)?.legalName ?? reportNames.get(identity.financialsEntityId) ?? identity.financialsEntityId
        : undefined;
    return {
        entityId: identity.entityId,
        legalName: identity.legalName,
        country: identity.country,
        ...(identity.lei ? { lei: identity.lei } : {}),
        ...(identity.krs ? { krs: identity.krs } : {}),
        ...(!identity.krs && identity.register ? { registeredAs: identity.register.id } : {}),
        ...(identity.category ? { category: identity.category } : {}),
        ...(identity.leiStatus ? { leiStatus: identity.leiStatus } : {}),
        status: identity.status,
        ...(identity.note ? { note: identity.note } : {}),
        otherNames: company.filter(i => i.issuerName !== identity.issuerName).map(i => i.issuerName).sort(),
        cardName,
        ...(figuresFrom ? { figuresFrom } : {}),
    };
}

export function financialsCoverage(filings: DbIssuerFinancialsRecord[], analysis: DbIssuerAnalysisSummary | undefined, identity?: DbIssuerIdentityRecord): FinancialsCoverage {
    const coverage: FinancialsCoverage = {};
    if (filings.length) {
        const ends = filings.map(f => f.periodEnd).sort();
        coverage.filed = {
            latestPeriodEnd: ends[ends.length - 1],
            earliestPeriodEnd: ends[0],
            years: new Set(ends).size,
            formats: [...new Set(filings.map(f => f.filing.format ?? 'krs-xml'))],
            scopes: [...new Set(filings.map(f => f.scope))].sort(),
            lastImportedAt: filings.map(f => f.importedAt).sort().at(-1)!,
        };
        const latest = [...filings].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd) || a.importedAt.localeCompare(b.importedAt)).at(-1)!;
        const country = latest.registration?.country ?? (latest.krs ? 'PL' : undefined);
        coverage.company = {
            name: latest.companyName,
            ...(country ? { country } : {}),
            ...(latest.krs ? { krs: latest.krs } : {}),
            ...(latest.lei ? { lei: latest.lei } : {}),
            ...(!latest.krs && latest.registration?.id ? { registeredAs: latest.registration.id } : {}),
        };
    }
    // Where it's registered: from its identity when it has one (every issuer, not only those with reports)
    if (identity) {
        coverage.company = {
            name: identity.legalName,
            country: identity.country,
            ...(identity.krs ? { krs: identity.krs } : {}),
            ...(identity.lei ? { lei: identity.lei } : {}),
            ...(!identity.krs && identity.register ? { registeredAs: identity.register.id } : {}),
        };
    }
    if (analysis) {
        const years = (analysis.agentFinancials as { years?: unknown } | undefined)?.years;
        coverage.ai = { performedAt: analysis.performedAt, latestYear: latestAiYear(analysis), years: Array.isArray(years) ? years.length : 0 };
    }
    return coverage;
}

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const issuerFinancialsTable = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);

    const [issuerProfiles, analysisSummaries, financials, identities, bonds, fx] = await Promise.all([
        issuerProfilesTable.getProfiles(),
        issuerProfilesTable.getAllLatestAnalysisSummaries(),
        issuerFinancialsTable.getAll(),
        issuerProfilesTable.getIdentities(),
        new BondDetailsTable(dynamoDBClient, Resource.BondDetails.name).getActive(CORPORATE_BONDS),
        rates(),
    ]);
    const listed = bonds.map(b => ({ issuer: b.issuer, isin: b.isin, name: b.name, currency: b.currency, issueValue: b.issueValue, maturityDay: b.maturityDay.toISOString().slice(0, 10) }));
    const today = new Date().toISOString().slice(0, 10);
    return Success({ issuerProfiles: buildIssuerProfiles(issuerProfiles, analysisSummaries, financials, identities, { bonds: listed, rates: fx, today }) });
});

// The bond type whose issuers have reports (municipal, treasury and covered bonds have none)
const CORPORATE_BONDS = 'Corporate bonds';

export type MaturitiesInput = { bonds: (ListedBond & { issuer: string })[]; rates: Rates; today: string };

export function buildIssuerProfiles(
    issuerProfiles: Awaited<ReturnType<IssuerProfilesTable['getProfiles']>>,
    analysisSummaries: DbIssuerAnalysisSummary[],
    financials: DbIssuerFinancialsRecord[],
    identities: DbIssuerIdentityRecord[],
    maturities: MaturitiesInput = { bonds: [], rates: {}, today: new Date().toISOString().slice(0, 10) },
) {
    const analysisByIssuer = new Map(analysisSummaries.map(s => [s.issuerName, s]));
    const identityByName = new Map(identities.map(i => [i.issuerName, i]));
    // A company's name as its reports give it, for one without an identity of its own (a financing vehicle's parent)
    const reportNames = new Map(financials.map(f => [f.entityId, f.companyName]));
    const bondsByName = Map.groupBy(maturities.bonds, b => b.issuer);
    // The listed bonds a name's reports have to cover: those of every name whose figures come from the
    // same company (its other names, and a financing vehicle of the group)
    const companyBonds = (issuerName: string, identity: DbIssuerIdentityRecord | undefined) => {
        const names = identity ? identities.filter(i => i.financialsEntityId === identity.financialsEntityId).map(i => i.issuerName) : [issuerName];
        return [...new Set([issuerName, ...names])].flatMap(n => bondsByName.get(n) ?? []);
    };

    return issuerProfiles.map(profile => {
        const analysis = analysisByIssuer.get(profile.issuerName);
        const identity = identityByName.get(profile.issuerName);
        const filings = reportsOf(profile.issuerName, identity, financials);
        const coverage = financialsCoverage(filings, analysis, identity);
        const bonds = companyBonds(profile.issuerName, identity);
        const report = latestReport(filings);
        const refi = bonds.length || report ? refinancing(bonds, report, maturities.today, maturities.rates) : undefined;
        const base = {
            ...profile, financialsCoverage: coverage,
            ...(identity ? { identity: identityView(identity, identities, reportNames) } : {}),
            ...(refi ? { refinancing: refi } : {}),
        };
        if (!isInFundamentalScope(profile.industry)) {
            return { ...base, scorecard: undefined, performedAt: undefined };
        }
        const { scorecard, financialsSource } = scorecardWithSource(profile.issuerName, filings, analysis, ruleSetFor(profile.industry));
        const dimension = refi && refinancingDimension(refi);
        return {
            ...base,
            ...(scorecard ? { scorecard: dimension ? { ...scorecard, dimensions: [...scorecard.dimensions, dimension] } : scorecard } : {}),
            ...(financialsSource ? { financialsSource } : {}),
            performedAt: analysis?.performedAt,
        };
    });
}
