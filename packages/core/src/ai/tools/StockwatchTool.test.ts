import { describe, it, expect } from 'vitest';
import { extractTableText } from './StockwatchTool';

// Minimal copy of stockwatch.pl's financial data table: quarterly columns, a P&L row,
// then the balance sheet section. Shaped like Dadelo's page, where 2026 had only Q1.
function stockwatchPage(periods: string[], rows: [string, (number | null)[]][]): string {
    const header = periods.map(p => `<th class="factPeriod"><b>${p}</b></th>`).join('');
    const body = rows.map(([label, values]) =>
        `<tr><td>${label}</td><td></td>${values.map(v => `<td>${v === null ? '' : v.toLocaleString('fr-FR')}</td>`).join('')}</tr>`
    ).join('');
    return `<div id="FinancialData_Async_Table"><table><tr><th></th><th></th>${header}</tr>${body}</table></div>`;
}

const PERIODS = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'];

describe('StockwatchTool extractTableText', () => {
    const text = extractTableText(stockwatchPage(PERIODS, [
        ['Przychody ze sprzedaży', [100, 110, 120, 114, 143]],
        ['Data bilansowa', [null, null, null, null, null]],
        ['Kapitał własny', [130, 135, 138, 140, 148]],
    ]));

    it('sums the quarters of a complete year and takes Q4 for balance sheet rows', () => {
        expect(text).toContain('Metric | 2025');
        expect(text).toContain('Przychody ze sprzedaży | 444');
        expect(text).toContain('Kapitał własny | 140');
    });

    it('leaves out a year without all four quarters', () => {
        expect(text).not.toContain('2026');
        expect(text).not.toContain('143');
    });

    it('returns nothing when no year is complete', () => {
        expect(extractTableText(stockwatchPage(['Q1 2026', 'Q2 2026'], [
            ['Przychody ze sprzedaży', [143, 150]],
        ]))).toBe('');
    });
});
