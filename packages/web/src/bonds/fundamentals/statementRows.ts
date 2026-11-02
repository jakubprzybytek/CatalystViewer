import type { StatementLine, StatementName } from '../../sdk/Issuers';

export type StatementRow = StatementLine & { depth: number; subtotal: boolean };

const TOTALS = new Set(['totalAssets', 'totalEquityAndLiabilities', 'noncurrentAssets', 'currentAssets', 'equity', 'totalLiabilities',
  'noncurrentLiabilities', 'currentLiabilities', 'revenue', 'grossProfit', 'ebit', 'profitBeforeTax', 'netProfit',
  'operatingCashFlow', 'investingCashFlow', 'financingCashFlow']);

// One statement's lines in order, with an indent and whether the line is a subtotal. The indent follows
// the parent chain (KRS XML, ESEF); a line outside the chain sits at the indent of the line before it.
export function statementRows(lines: StatementLine[], statement: StatementName): StatementRow[] {
  const own = lines.filter(l => l.statement === statement).sort((a, b) => a.order - b.order);
  const byOrder = new Map(own.map(l => [l.order, l]));
  const parents = new Set(own.map(l => l.parent).filter((p): p is number => p !== undefined));
  const depthOf = (l: StatementLine, seen = new Set<number>()): number => {
    const parent = l.parent === undefined ? undefined : byOrder.get(l.parent);
    if (!parent || seen.has(l.order)) return 0;
    seen.add(l.order);
    return depthOf(parent, seen) + 1;
  };
  let previous = 0;
  return own.map(l => {
    const inChain = l.parent !== undefined || parents.has(l.order);
    const depth = Math.min(inChain ? depthOf(l) : parents.size ? previous : 0, 4);
    previous = depth;
    return { ...l, depth, subtotal: parents.has(l.order) || (l.item !== undefined && TOTALS.has(l.item)) };
  });
}

const ITEM_LABELS: Record<string, string> = {
  ebit: 'EBIT', capex: 'capex', debtBankLoans: 'debt: bank loans', debtBonds: 'debt: bonds', debtLeases: 'debt: leases',
  debtMixed: 'debt: combined', debtOther: 'debt: other', propertyPlantEquipment: 'PP&E', minorityInterests: 'non-controlling interests',
  contractLiabilities: 'contract liabilities / advances',
};

// "tradeReceivables" → "trade receivables"
export function itemLabel(item: string): string {
  return ITEM_LABELS[item] ?? item.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
}

// The printed unit's name: "PLN thousands"
export function unitLabel(currency: string, unit: 1 | 1000 | 1000000): string {
  return unit === 1000000 ? `${currency} millions` : unit === 1000 ? `${currency} thousands` : currency;
}
