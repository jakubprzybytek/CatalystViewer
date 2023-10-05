import { BondDetails, BondCurrentValues } from '../sdk/GetBonds';

export type YieldToMaturityReport = {
  bondDetails: BondDetails;
  bondCurrentValues: BondCurrentValues;

  price: number;
  taxRate: number;
  commissionRate: number;

  nominalPrice: number;
  buyingPrice: number;
  buyingCommision: number;
  totalBuyingPrice: number;
  timeToMature: number;

  totalPayableInterest: number;
  interestTax: number;
  netTotalPayableInterest: number;

  saleProfit: number;
  saleTax: number;
  saleIncome: number;

  profit: number;
  ytm: number;
}

export class YieldToMaturityCalculator {
  bondDetails: BondDetails;
  bondCurrentValues: BondCurrentValues;
  commisionRate: number;

  constructor(bondDetails: BondDetails, bondCurrentValues: BondCurrentValues, commisionRate: number) {
    this.bondDetails = bondDetails;
    this.bondCurrentValues = bondCurrentValues;
    this.commisionRate = commisionRate;
  }

  forPrice(price: number, taxRate: number, today: Date = new Date()): YieldToMaturityReport {
    const nominalPrice = this.bondDetails.nominalValue * price / 100;
    const buyingPrice = nominalPrice + this.bondCurrentValues.accuredInterest;
    const buyingCommision = buyingPrice * this.commisionRate;
    const totalBuyingPrice = buyingPrice + buyingCommision;

    const timeToMature = Math.ceil(this.bondDetails.maturityDayTs - today.valueOf()) / (1000 * 3600 * 24) / 365;

    const totalPayableInterest = this.bondCurrentValues.accuredInterest + (this.bondDetails.nominalValue * this.bondCurrentValues.interestRate / 100) * timeToMature;
    const interestTax = totalPayableInterest * taxRate;
    const netTotalPayableInterest = totalPayableInterest - interestTax;

    const saleProfit = this.bondDetails.nominalValue - totalBuyingPrice;
    const saleTax = saleProfit > 0 ? saleProfit * taxRate : 0;
    const saleIncome = this.bondDetails.nominalValue - saleTax;

    const profit = saleIncome + netTotalPayableInterest - totalBuyingPrice;

    const profitRate = profit / totalBuyingPrice;
    const ytm = Math.pow(profitRate + 1, 1 / timeToMature) - 1;

    return {
      bondDetails: this.bondDetails,
      bondCurrentValues: this.bondCurrentValues,

      price,
      taxRate,
      commissionRate: this.commisionRate,

      nominalPrice,
      buyingPrice,
      buyingCommision,
      totalBuyingPrice,
      timeToMature,

      totalPayableInterest,
      interestTax,
      netTotalPayableInterest,

      saleProfit,
      saleTax,
      saleIncome,

      profit,
      ytm
    }
  }
}
