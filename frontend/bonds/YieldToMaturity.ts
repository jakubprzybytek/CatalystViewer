import { BondDetails, BondCurrentValues } from '../sdk/GetBonds';

export type YieldToMaturityReport = {
  currency: string;

  buyingPrice: number;
  buyingCommision: number;
  totalBuyingPrice: number;
  timeToMature: number;
  totalInterests: number;
  interestsTax: number;
  saleProfit: number;
  saleTax: number;
  totalSaleIncome: number;
  totalSaleCosts: number;
  totalSaleProfit: number;
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
    const buyingPrice = this.bondDetails.nominalValue * price / 100 + this.bondCurrentValues.accuredInterest;
    const buyingCommision = buyingPrice * this.commisionRate;
    const totalBuyingPrice = buyingPrice + buyingCommision;

    const timeToMature = Math.ceil(this.bondDetails.maturityDayTs - today.valueOf()) / (1000 * 3600 * 24) / 365;

    const totalInterests = this.bondCurrentValues.accuredInterest + (this.bondDetails.nominalValue * this.bondCurrentValues.interestRate / 100) * timeToMature;
    const interestsTax = totalInterests * taxRate;
    const saleProfit = this.bondDetails.nominalValue - totalBuyingPrice;
    const saleTax = saleProfit > 0 ? saleProfit * taxRate : 0;

    const totalSaleIncome = this.bondDetails.nominalValue + totalInterests;
    const totalSaleCosts = interestsTax + saleTax;

    const totalSaleProfit = totalSaleIncome - totalSaleCosts;

    const profit = totalSaleProfit - totalBuyingPrice;

    const profitRate = profit / totalBuyingPrice;
    const ytm = Math.pow(profitRate + 1, 1 / timeToMature) - 1;

    return {
      currency: this.bondDetails.currency,

      buyingPrice,
      buyingCommision,
      totalBuyingPrice,
      timeToMature,
      totalInterests,
      interestsTax,
      saleProfit,
      saleTax,
      totalSaleIncome,
      totalSaleCosts,
      totalSaleProfit,
      profit,
      ytm
    }
  }
}
