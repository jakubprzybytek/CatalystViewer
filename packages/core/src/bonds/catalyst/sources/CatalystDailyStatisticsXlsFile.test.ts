import { describe, it, expect } from "vitest";
import path from 'path';
import { readCatalystDailyStatisticsXlsFile } from "./CatalystDailyStatisticsXlsFile";

const FIXTURE = path.join(__dirname, '../../../../../../tests/fixtures/sources/gpwcatalyst/catalyst_20261026.xlsx');

describe("readCatalystDailyStatisticsXlsFile", () => {
  it("reads the bonds of the instrumenty sheet with the type from the section rows above them", async () => {
    const bonds = await readCatalystDailyStatisticsXlsFile(FIXTURE);

    expect(bonds).toHaveLength(20);
    expect(new Set(bonds.map(b => b.type))).toEqual(new Set(['Corporate bonds', 'Municipal and EIB bonds', 'Treasury and BGK bonds', 'Mortgage covered bonds']));
    expect(bonds[0]).toEqual({
      name: 'ACH0628',
      isin: 'PLARCHE00070',
      type: 'Corporate bonds',
      market: 'GPW ASO',
      nominalValue: 1000,
      maturityDay: new Date('2028-06-18T00:00:00.000Z'),
      currentInterestRate: 8.34,
      accuredInterest: 9.14,
      tradingCurrency: 'PLN',
      closingPrice: 103.01,
    });
  });
});
