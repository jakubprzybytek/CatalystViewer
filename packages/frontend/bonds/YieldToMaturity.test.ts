import { BondCurrentValues, BondDetails } from '../sdk/GetBonds';
import { describe, it, expect } from "vitest";
import { YieldToMaturityCalculator } from "./YieldToMaturity";

const bondDetails: BondDetails = {
  name: 'TST1234',
  isin: 'isin',
  issuer: 'n/a',
  market: 'GPW RR',
  type: 'Corporate Bond',
  nominalValue: 1000,
  issueValue: 1000000,
  currency: 'PLN',
  maturityDayTs: new Date('2023-10-01T00:00:00.000Z').getTime(),
  interestType: 'zmienne WIBOR 6m + 1%',
  interestVariable: 'WIBOR 6M',
  interestConst: 1
};

const bondCurrentValues: BondCurrentValues = {
  yearsToMaturity: 0, // not needed

  interestFirstDay: 0, // not needed
  interestRecordDay: 0, // not needed
  interestPayableDay: 0, // not needed

  interestRate: 10,
  accuredInterest: 20,
  periodInterest: 0, // not needed
};

describe("YieldToMatorityCalculator", () => {
  it("should calculate net ytm", () => {
    const ytmCalculator = new YieldToMaturityCalculator(bondDetails, bondCurrentValues, 0.0019);
    const ytm = ytmCalculator.forPrice(95, 0.19, new Date('2022-10-01T00:00:00.000Z'));

    expect(ytm.buyingPrice).toBe(1000 * 0.95 + 20);
    expect(ytm.buyingCommision).toBe(970 * 0.0019);
    expect(ytm.totalBuyingPrice).toBe(971.843); // 970 * 1.0019

    expect(ytm.timeToMature).toBe(1);

    expect(ytm.totalPayableInterest).toBe(20 + 100);
    expect(ytm.interestTax).toBe(120 * 0.19);
    expect(ytm.netTotalPayableInterest).toBe(97.2);

    expect(ytm.saleProfit).toBeCloseTo(28.157, 3); // 1000 - (970 * 1.0019)
    expect(ytm.saleTax).toBeCloseTo(5.34983, 5); // (1000 - (970 * 1.0019)) * 0.19
    expect(ytm.saleIncome).toBeCloseTo(1000 - 5.34983, 5); // (1000 - (970 * 1.0019)) * 0.19

    expect(ytm.profit).toBeCloseTo(120.00717, 5); // 1120 - 28.14983 - 971.843

    expect(ytm.ytm).toBeCloseTo(0.12, 2);
  });

  it("should calculate net ytm for price > 100", () => {
    const ytmCalculator = new YieldToMaturityCalculator(bondDetails, bondCurrentValues, 0.0019);
    const ytm = ytmCalculator.forPrice(105, 0.19, new Date('2022-10-01T00:00:00.000Z'));

    expect(ytm.buyingPrice).toBe(1050 + 20);
    expect(ytm.buyingCommision).toBe(1070 * 0.0019);
    expect(ytm.totalBuyingPrice).toBe(1072.033);

    expect(ytm.timeToMature).toBe(1);

    expect(ytm.totalPayableInterest).toBe(20 + 100);
    expect(ytm.interestTax).toBe(120 * 0.19);
    expect(ytm.netTotalPayableInterest).toBe(97.2);

    expect(ytm.saleProfit).toBeCloseTo(-72.033, 3);
    expect(ytm.saleTax).toBe(0);
    expect(ytm.saleIncome).toBe(1000);

    expect(ytm.profit).toBeCloseTo(1000 + 97.2 - 1072.033, 5); // 1120 - 28.14983 - 971.843

    expect(ytm.ytm).toBeCloseTo(0.02, 2);
  });

  it("should calculate gross ytm", () => {
    const ytmCalculator = new YieldToMaturityCalculator(bondDetails, bondCurrentValues, 0.0019);
    const ytm = ytmCalculator.forPrice(95, 0, new Date('2022-10-01T00:00:00.000Z'));

    expect(ytm.buyingPrice).toBe(1000 * 0.95 + 20);
    expect(ytm.buyingCommision).toBe(970 * 0.0019);
    expect(ytm.totalBuyingPrice).toBe(971.843); // 970 * 1.0019

    expect(ytm.timeToMature).toBe(1);

    expect(ytm.totalPayableInterest).toBe(20 + 100);
    expect(ytm.interestTax).toBe(0);
    expect(ytm.netTotalPayableInterest).toBe(20 + 100);

    expect(ytm.saleProfit).toBeCloseTo(28.157, 3); // 1000 - (970 * 1.0019)
    expect(ytm.saleTax).toBe(0);
    expect(ytm.saleIncome).toBe(1000);

    expect(ytm.profit).toBeCloseTo(120 + 1000 - 971.843, 3); // 1120 - 971.843

    expect(ytm.ytm).toBeCloseTo(0.15, 2);
  });
});
