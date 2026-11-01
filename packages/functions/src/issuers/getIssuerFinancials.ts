import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Resource } from 'sst';
import { IssuerProfilesTable, type DbIssuerAnalysisSummary } from '@core/storage/issuerProfiles';
import { IssuerFinancialsTable, type DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import type { FilingExtraction, FilingField, ParsedFiling } from '@core/bonds/fundamentals/filings/FilingParser';
import { lambdaHandler, Success } from '../HandlerProxy';
import { scorecardWithSource, type FinancialsSource } from './getIssuerProfiles';

const dynamoDBClient = new DynamoDBClient({});
const s3Client = new S3Client({});
const LINK_SECONDS = 15 * 60;

// An issuer's yearly figures from every source, for the Financials view: each filed year (group and
// single-company accounts separately) and each year of the latest AI analysis. Amounts in millions.
export type FiledYearView = {
    periodEnd: string;
    periodStart: string;
    months: number;
    scope: 'single' | 'group';
    currency: string;
    column: 'current' | 'previous';   // the filing's own year, or its comparative column
    format: ParsedFiling['format'];
    schema: string;
    importedAt: string;
    checks: string[];
    notes: string[];
    extraction?: FilingExtraction;
    documentKey: string;
    documentUrl?: string;            // temporary link to the original file
    figures: Partial<Record<FilingField, { value: number; source: string[] }>>;
};

export type AiYearView = { year: number; figures: Partial<Record<FilingField, number>> };

export type IssuerFinancialsView = {
    issuerName: string;
    filed: FiledYearView[];                               // newest first
    ai?: { performedAt: string; years: AiYearView[] };    // newest first
    scorecardSource?: FinancialsSource;                   // which of them the scorecard uses
};

const AI_FIELDS: FilingField[] = ['revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit', 'totalAssets', 'intangibleAssets',
    'equity', 'financialDebt', 'cash', 'currentAssets', 'inventory', 'currentLiabilities'];

export function buildIssuerFinancials(issuerName: string, filings: DbIssuerFinancialsRecord[], analysis: DbIssuerAnalysisSummary | undefined): IssuerFinancialsView {
    const filed = [...filings]
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd) || a.scope.localeCompare(b.scope))
        .map((r): FiledYearView => ({
            periodEnd: r.periodEnd,
            periodStart: r.periodStart,
            months: r.months,
            scope: r.scope,
            currency: r.currency,
            column: r.column,
            format: r.filing.format ?? 'krs-xml',
            schema: r.filing.schema,
            importedAt: r.importedAt,
            checks: r.filing.checks ?? [],
            notes: r.filing.notes ?? [],
            extraction: r.filing.extraction,
            documentKey: r.filing.key,
            figures: Object.fromEntries(Object.entries(r.figures).map(([field, f]) => [field, { value: f!.value / 1_000_000, source: f!.source }])),
        }));

    const rawYears = (analysis?.agentFinancials as { years?: Record<string, unknown>[] } | undefined)?.years;
    const ai = analysis && Array.isArray(rawYears) ? {
        performedAt: analysis.performedAt,
        years: rawYears
            .map((y): AiYearView => ({
                year: Number(y.year),
                figures: Object.fromEntries(AI_FIELDS.flatMap(field => {
                    const value = Number(y[field]);
                    return y[field] !== null && y[field] !== undefined && typeof y[field] !== 'boolean' && Number.isFinite(value) ? [[field, value]] : [];
                })),
            }))
            .filter(y => Number.isFinite(y.year))
            .sort((a, b) => b.year - a.year),
    } : undefined;

    return { issuerName, filed, ai, scorecardSource: scorecardWithSource(issuerName, filings, analysis).financialsSource };
}

export const handler = lambdaHandler(async (event) => {
    const issuerName = decodeURIComponent(event.pathParameters?.name ?? '');
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);
    const issuerFinancialsTable = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);

    const [filings, analysis] = await Promise.all([
        issuerFinancialsTable.getByIssuer(issuerName),
        issuerProfilesTable.getLatestAnalysisSummary(issuerName),
    ]);
    const view = buildIssuerFinancials(issuerName, filings, analysis);

    // One link per original file
    const links = new Map<string, string>();
    for (const key of new Set(view.filed.map(y => y.documentKey))) {
        links.set(key, await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: Resource.Filings.name, Key: key }), { expiresIn: LINK_SECONDS }));
    }
    for (const year of view.filed) year.documentUrl = links.get(year.documentKey);

    return Success(view);
});
