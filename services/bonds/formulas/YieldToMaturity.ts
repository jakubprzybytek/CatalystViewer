import { BondDetails } from '..';

export type YieldToMaturityReport = {
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
    commisionRate: number;
    taxRate: number;

    constructor(bondDetails: BondDetails, commisionRate: number, taxRate: number) {
        this.bondDetails = bondDetails;
        this.commisionRate = commisionRate;
        this.taxRate = taxRate;
    }

    forPrice(price: number, today: Date = new Date()): YieldToMaturityReport {
        const buyingPrice = this.bondDetails.nominalValue * price / 100 + this.bondDetails.accuredInterest;
        const buyingCommision = buyingPrice * this.commisionRate;
        const totalBuyingPrice = buyingPrice + buyingCommision;

        const timeToMature = Math.ceil(this.bondDetails.maturityDay.valueOf() - today.valueOf()) / (1000 * 3600 * 24) / 365;

        const totalInterests = this.bondDetails.accuredInterest + (this.bondDetails.nominalValue * this.bondDetails.currentInterestRate / 100) * timeToMature;
        const interestsTax = totalInterests * this.taxRate;
        const saleProfit = this.bondDetails.nominalValue - totalBuyingPrice;
        const saleTax = saleProfit > 0 ? saleProfit * this.taxRate : 0;

        const totalSaleIncome = this.bondDetails.nominalValue + totalInterests;
        const totalSaleCosts = interestsTax + saleTax;

        const totalSaleProfit = totalSaleIncome - totalSaleCosts;

        const profit = totalSaleProfit - totalBuyingPrice;

        const profitRate = profit / totalBuyingPrice;
        const ytm = Math.pow(profitRate + 1, 1 / timeToMature) - 1;

        return {
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
};
