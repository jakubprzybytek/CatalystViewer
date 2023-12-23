import { CatalystBondQuote } from "@catalyst-viewer/core/bonds/catalyst";
import { describe, it, expect } from "vitest";
import { toBondStatistics } from "./updateBondReports";

describe("updateBondReports", () => {
  it("should build DBBondStatistics", () => {
    const quote: CatalystBondQuote = {
      name: 'ABc1234',
      market: 'GPW RR',
      referencePrice: 100.0,
      lastDateTime: '2023-12-05',
      lastPrice: 100.0,
      bidCount: 1,
      bidVolume: 3,
      bidPrice: 99.0,
      askPrice: 101.0,
      askVolume: 3,
      askCount: 2,
      transactions: 2,
      volume: 12,
      turnover: 123,
      currency: 'PLN'
    };

    expect(toBondStatistics(quote)).toEqual({
      
    });

  });
});
