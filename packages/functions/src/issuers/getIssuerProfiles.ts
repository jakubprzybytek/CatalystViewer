import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable, DbIssuerAnalysisSummary } from '@core/storage/issuerProfiles';
import { IssuerFinancialsTable, type DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import { scorecardFromReportedYears, type FundamentalScorecard, type ReportedYear } from '@core/bonds/fundamentals/scorecard';
import { filedYears } from '@core/bonds/fundamentals/filings/filedYears';
import { isInFundamentalScope } from '@core/bonds/fundamentals/scope';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

// Recomputed from the stored figures, so fixes to the scoring rules reach existing analyses
// without new (paid) runs. Falls back to the stored scorecard for records without figures.
export function currentScorecard(summary: DbIssuerAnalysisSummary): FundamentalScorecard | undefined {
    const years = (summary.agentFinancials as { years?: unknown } | undefined)?.years;
    if (Array.isArray(years)) {
        return scorecardFromReportedYears(summary.issuerName, years as ReportedYear[]);
    }
    return summary.scorecard;
}

// Where the scorecard's figures come from: the issuer's filed statements (KRS XML, ESEF or IFRS report)
// or the AI analysis.
export type FinancialsSource =
    | { kind: 'filing'; format: 'krs-xml' | 'esef' | 'ifrs-text'; scope: 'single' | 'group'; latestPeriodEnd: string; years: number }
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
): { scorecard?: FundamentalScorecard; financialsSource?: FinancialsSource } {
    const filed = filedYears(filings);
    const aiYear = latestAiYear(analysis);
    if (filed && (aiYear === undefined || Number(filed.latestPeriodEnd.slice(0, 4)) >= aiYear)) {
        return {
            scorecard: scorecardFromReportedYears(issuerName, filed.years),
            financialsSource: { kind: 'filing', format: filed.format, scope: filed.scope, latestPeriodEnd: filed.latestPeriodEnd, years: filed.years.length },
        };
    }
    if (analysis) {
        return { scorecard: currentScorecard(analysis), financialsSource: { kind: 'ai', performedAt: analysis.performedAt } };
    }
    return {};
}

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const issuerFinancialsTable = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);

    const [issuerProfiles, analysisSummaries, financials] = await Promise.all([
        issuerProfilesTable.getProfiles(),
        issuerProfilesTable.getAllLatestAnalysisSummaries(),
        issuerFinancialsTable.getAll(),
    ]);

    const analysisByIssuer = new Map(analysisSummaries.map(s => [s.issuerName, s]));
    const filingsByIssuer = Map.groupBy(financials, f => f.issuerName);

    const mergedProfiles = issuerProfiles.map(profile => {
        if (!isInFundamentalScope(profile.industry)) {
            return { ...profile, scorecard: undefined, performedAt: undefined };
        }
        const analysis = analysisByIssuer.get(profile.issuerName);
        return {
            ...profile,
            ...scorecardWithSource(profile.issuerName, filingsByIssuer.get(profile.issuerName) ?? [], analysis),
            performedAt: analysis?.performedAt,
        };
    });

    return Success({ issuerProfiles: mergedProfiles });
});
