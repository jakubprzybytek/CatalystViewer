import { describe, expect, it } from 'vitest';
import { maturityYears } from './maturityYears';

describe('maturityYears', () => {
  it('groups bonds by year, totalling those with a rate', () => {
    const bond = (name: string, maturityDay: string, amount: number, inReportCurrency?: number) => ({ isin: name, name, maturityDay, currency: 'PLN', amount, ...(inReportCurrency !== undefined ? { inReportCurrency } : {}) });
    expect(maturityYears([bond('A', '2027-03-01', 10, 10), bond('B', '2027-09-01', 5), bond('C', '2028-01-01', 7)])).toEqual([
      { year: '2027', bonds: [expect.objectContaining({ name: 'A' }), expect.objectContaining({ name: 'B' })], total: 10 },
      { year: '2028', bonds: [expect.objectContaining({ name: 'C' })] },
    ]);
  });
});
