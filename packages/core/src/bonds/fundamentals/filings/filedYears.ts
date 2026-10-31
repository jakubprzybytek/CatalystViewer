// Turns stored filing rows into the yearly figures the scorecard takes (ReportedYear, PLN millions,
// like the AI-collected figures), for one issuer.
import type { DbIssuerFinancialsRecord } from '../../../storage/issuerFinancials';
import type { ReportedYear } from '../scorecard';
import type { FilingField, FilingScope, ParsedFiling } from './FilingParser';

const SCORECARD_FIELDS: FilingField[] = [
    'revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit', 'totalAssets', 'intangibleAssets',
    'equity', 'financialDebt', 'cash', 'currentAssets', 'inventory', 'currentLiabilities',
];
const MAX_YEARS = 5;

export type FiledYears = {
    scope: FilingScope;
    format: ParsedFiling['format'];  // of the latest year's filing
    latestPeriodEnd: string;
    years: ReportedYear[];      // newest first, full fiscal years only
};

// Group accounts when there are any (they include the subsidiaries' debt), otherwise single-company
// accounts; the two are never mixed. Only 12-month fiscal years are used. Undefined when there's none.
export function filedYears(records: DbIssuerFinancialsRecord[]): FiledYears | undefined {
    const fullYears = records.filter(r => r.months === 12);
    const scope: FilingScope = fullYears.some(r => r.scope === 'group') ? 'group' : 'single';
    const rows = fullYears
        .filter(r => r.scope === scope)
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))
        .slice(0, MAX_YEARS);
    if (rows.length === 0) return undefined;

    return {
        scope,
        format: rows[0].filing.format ?? 'krs-xml',
        latestPeriodEnd: rows[0].periodEnd,
        years: rows.map(r => {
            const year: ReportedYear = { year: Number(r.periodEnd.slice(0, 4)) };
            for (const field of SCORECARD_FIELDS) {
                const figure = r.figures[field];
                (year as Record<string, number | null>)[field] = figure ? figure.value / 1_000_000 : null;
            }
            return year;
        }),
    };
}
