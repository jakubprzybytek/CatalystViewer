import { BondDetails } from "bonds";
import { describe, it, expect } from "vitest";
import { YieldToMaturityCalculator } from "./YieldToMaturity";

const bondDetails: BondDetails = {
  name: 'TST1234',
  isin: 'isin',
  issuer: 'n/a',
  market: 'GPW RR',
  type: 'Corporate Bond',
  nominalValue: 1000,
  maturityDay: new Date('2023-10-01T00:00:00.000Z'),
  interestType: 'zmienne WIBOR 6m + 1%',
  interestVariable: 'WIBOR 6M',
  interestConst: 1,
  currentInterestRate: 10,
  accuredInterest: 20
};

describe("YieldToMatorityCalculator", () => {
  it("should calculate net ytm", () => {
    const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019);
    const ytm = ytmCalculator.forPrice(95, 0.19, new Date('2022-10-01T00:00:00.000Z'));

    expect(ytm.buyingPrice).toBe(1000 * 0.95 + 20);
    expect(ytm.buyingCommision).toBe(970 * 0.0019);
    expect(ytm.totalBuyingPrice).toBe(971.843); // 970 * 1.0019

    expect(ytm.timeToMature).toBe(1);

    expect(ytm.totalInterests).toBe(20 + 100);
    expect(ytm.interestsTax).toBe(120 * 0.19);
    expect(ytm.saleProfit).toBeCloseTo(28.157, 3); // 1000 - (970 * 1.0019)
    expect(ytm.saleTax).toBeCloseTo(5.34983, 5); // (1000 - (970 * 1.0019)) * 0.19

    expect(ytm.totalSaleIncome).toBe(1000 + 120);
    expect(ytm.totalSaleCosts).toBeCloseTo(28.14983, 5); // 120 * 0.19 + (1000 - (970 * 1.0019)) * 0.19
    expect(ytm.totalSaleProfit).toBeCloseTo(1091.85017, 5); // 1120 - 28.14983

    expect(ytm.profit).toBeCloseTo(120.00717, 5); // 1120 - 28.14983 - 971.843

    expect(ytm.ytm).toBeCloseTo(0.12, 2);
  });

  it("should calculate gross ytm", () => {
    const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019);
    const ytm = ytmCalculator.forPrice(95, 0, new Date('2022-10-01T00:00:00.000Z'));

    expect(ytm.buyingPrice).toBe(1000 * 0.95 + 20);
    expect(ytm.buyingCommision).toBe(970 * 0.0019);
    expect(ytm.totalBuyingPrice).toBe(971.843); // 970 * 1.0019

    expect(ytm.timeToMature).toBe(1);

    expect(ytm.totalInterests).toBe(20 + 100);
    expect(ytm.interestsTax).toBe(0);
    expect(ytm.saleProfit).toBeCloseTo(28.157, 3); // 1000 - (970 * 1.0019)
    expect(ytm.saleTax).toBe(0);

    expect(ytm.totalSaleIncome).toBe(1000 + 120);
    expect(ytm.totalSaleCosts).toBe(0);
    expect(ytm.totalSaleProfit).toBe(1120);

    expect(ytm.profit).toBeCloseTo(148.157, 5); // 1120 - 971.843

    expect(ytm.ytm).toBeCloseTo(0.15, 2);
  });
});
