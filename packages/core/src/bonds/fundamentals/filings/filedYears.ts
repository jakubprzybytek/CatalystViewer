// Turns stored filing rows into the yearly figures the scorecard takes (ReportedYear, PLN millions,
// like the AI-collected figures), for one issuer.
import type { DbIssuerFinancialsRecord } from '../../../storage/issuerFinancials';
import type { ReportedYear } from '../scorecard';
import type { FilingField, FilingScope, ParsedFiling } from './FilingParser';
import type { LineItem } from './statementLines';

const SCORECARD_FIELDS: FilingField[] = [
    'revenue', 'ebit', 'depreciation', 'interestExpense', 'netProfit', 'totalAssets', 'intangibleAssets',
    'equity', 'financialDebt', 'cash', 'currentAssets', 'inventory', 'currentLiabilities', 'operatingCashFlow', 'capex',
];

// Inputs of the sector rules taken from the statement lines' item totals
const ITEM_INPUTS: [keyof ReportedYear, LineItem][] = [
    ['investmentProperty', 'investmentProperty'], ['contractLiabilities', 'contractLiabilities'],
    ['leases', 'debtLeases'], ['interestPaid', 'interestPaid'],
];

// The depreciation figure already includes write-downs when one of its sources does (a "depreciation,
// amortisation and impairment" line) and none takes a write-down out again (Cyfrowy Polsat).
const IMPAIRMENT_SOURCE = /impair|utrat|odpis|értékveszt/i;
export function writeDownsOutsideDepreciation(record: Pick<DbIssuerFinancialsRecord, 'items' | 'figures'>): number | undefined {
    const writeDowns = record.items?.impairment;
    if (writeDowns === undefined) return undefined;
    const sources = record.figures.depreciation?.source ?? [];
    const included = sources.some(s => !s.startsWith('−') && IMPAIRMENT_SOURCE.test(s)) && !sources.some(s => s.startsWith('−') && IMPAIRMENT_SOURCE.test(s));
    return included ? 0 : writeDowns;
}

// EBIT for an income statement without an operating profit line (KGHM, Polenergia): profit before tax
// with the finance costs added back and the finance income taken out. Amounts in units, signs as printed
// or as costs, so both are taken as sizes.
export function ebitFromProfitBeforeTax(items: DbIssuerFinancialsRecord['items']): number | undefined {
    const pbt = items?.profitBeforeTax;
    if (pbt === undefined || (items?.financeCosts === undefined && items?.financeIncome === undefined)) return undefined;
    return pbt + Math.abs(items.financeCosts ?? 0) - Math.abs(items.financeIncome ?? 0);
}

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
            for (const [field, item] of ITEM_INPUTS) {
                const total = r.items?.[item];
                if (total !== undefined) (year as Record<string, number | null>)[field] = total / 1_000_000;
            }
            const derivedEbit = r.figures.ebit ? undefined : ebitFromProfitBeforeTax(r.items);
            if (derivedEbit !== undefined) {
                year.ebit = derivedEbit / 1_000_000;
                year.ebitDerived = 1;
            }
            const writeDowns = writeDownsOutsideDepreciation(r);
            if (writeDowns !== undefined) year.writeDowns = writeDowns / 1_000_000;
            return year;
        }),
    };
}
