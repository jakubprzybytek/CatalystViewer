import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerProfilesTable, DbIssuerAnalysisSummary } from '@core/storage/issuerProfiles';
import { scorecardFromReportedYears, type FundamentalScorecard, type ReportedYear } from '@core/bonds/fundamentals/scorecard';
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

export const handler = lambdaHandler(async () => {
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const [issuerProfiles, analysisSummaries] = await Promise.all([
        issuerProfilesTable.getProfiles(),
        issuerProfilesTable.getAllLatestAnalysisSummaries(),
    ]);

    const analysisByIssuer = new Map(analysisSummaries.map(s => [s.issuerName, s]));

    const mergedProfiles = issuerProfiles.map(profile => {
        const analysis = isInFundamentalScope(profile.industry) ? analysisByIssuer.get(profile.issuerName) : undefined;
        return {
            ...profile,
            scorecard: analysis ? currentScorecard(analysis) : undefined,
            performedAt: analysis?.performedAt,
        };
    });

    return Success({ issuerProfiles: mergedProfiles });
});
