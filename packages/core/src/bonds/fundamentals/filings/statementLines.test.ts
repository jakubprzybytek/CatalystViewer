import { describe, expect, it } from 'vitest';
import { debtKind, itemsFromFigures, lineChecks, type StatementLine } from './statementLines';

const line = (order: number, label: string, value: number, extra: Partial<StatementLine> = {}): StatementLine => ({ statement: 'balance', order, label, value, ...extra });

describe('debtKind', () => {
    it.each([
        ['Kredyty i pożyczki', false, 'debtBankLoans'],
        ['Obligacje', false, 'debtBonds'],
        ['Zobowiązania z tytułu leasingu', false, 'debtLeases'],
        ['Kredyty, pożyczki i obligacje', false, 'debtMixed'],
        ['ifrs-full:NoncurrentPortionOfNoncurrentBondsIssued Obligacje długoterminowe', true, 'debtBonds'],
        ['inne zobowiązania finansowe', false, 'debtOther'],
    ] as const)('%s → %s', (text, bond, kind) => expect(debtKind(text, bond)).toBe(kind));
});

describe('itemsFromFigures', () => {
    it('tags the lines a figure is made of, and leaves summed parts of a total alone', () => {
        const lines = [line(0, 'Przychody A', 10, { statement: 'income' }), line(1, 'Przychody B', 5, { statement: 'income' }), line(2, 'Zapasy', 7), line(3, 'Kredyty', 3)];
        itemsFromFigures(lines, {
            revenue: { value: 15, source: ['Przychody A', 'Przychody B'] },
            inventory: { value: 7, source: ['Zapasy'] },
            financialDebt: { value: 3, source: ['Kredyty'] },
        }, s => lines.find(l => l.label === s));
        expect(lines.map(l => l.item)).toEqual([undefined, undefined, 'inventory', 'debtBankLoans']);
    });
});

describe('lineChecks', () => {
    it('reports a total its lines do not add up to', () => {
        const lines = [line(0, 'Aktywa trwałe', 40, { parent: 2 }), line(1, 'Aktywa obrotowe', 50, { parent: 2 }), line(2, 'Aktywa razem', 100, { item: 'totalAssets' })];
        expect(lineChecks(lines, '2025-12-31', 1)).toEqual(['2025-12-31: the lines under "Aktywa razem" add up to 90, not 100']);
        expect(lineChecks(lines, '2025-12-31', 10)).toEqual([]);
    });
});
