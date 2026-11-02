import { describe, expect, it } from 'vitest';
import type { StatementLine } from '../../sdk/Issuers';
import { itemLabel, statementRows, unitLabel } from './statementRows';

const line = (order: number, label: string, extra: Partial<StatementLine> = {}): StatementLine => ({ statement: 'balance', order, label, value: 1, ...extra });

describe('statementRows', () => {
  it('indents by the parent chain and marks subtotals', () => {
    const rows = statementRows([
      line(2, 'Aktywa trwałe', { parent: 3 }),
      line(0, 'Wartości niematerialne', { parent: 2 }),
      line(1, 'Inne', {}),
      line(3, 'Aktywa razem', { item: 'totalAssets' }),
      line(0, 'Przychody', { statement: 'income' }),
    ], 'balance');
    expect(rows.map(r => [r.label, r.depth, r.subtotal])).toEqual([
      ['Wartości niematerialne', 2, false],
      ['Inne', 2, false],              // outside the chain: the indent of the line before
      ['Aktywa trwałe', 1, true],
      ['Aktywa razem', 0, true],
    ]);
  });

  it('keeps a flat statement flat (PDF, IFRS text)', () => {
    const rows = statementRows([line(0, 'Zapasy', { item: 'inventory' }), line(1, 'Aktywa razem', { item: 'totalAssets' })], 'balance');
    expect(rows.map(r => [r.depth, r.subtotal])).toEqual([[0, false], [0, true]]);
  });
});

describe('labels', () => {
  it('names items and units', () => {
    expect(itemLabel('tradeReceivables')).toBe('trade receivables');
    expect(itemLabel('debtBonds')).toBe('debt: bonds');
    expect(unitLabel('PLN', 1000)).toBe('PLN thousands');
    expect(unitLabel('HUF', 1000000)).toBe('HUF millions');
  });
});
