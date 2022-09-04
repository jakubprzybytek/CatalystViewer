import { downloadLatestCatalystDailyStatistics } from "./catalyst/CatalystSDK";
import { readCatalystDailyStatisticsXlsFile } from "bonds/catalyst/CatalystDailyStatisticsXlsFile";
import { YieldToMaturityCalculator } from "./formulas/YieldToMaturity";
import { BondDetails } from "bonds";

async function ytm() {
    const catalystDailyStatisticsFileName = await downloadLatestCatalystDailyStatistics();
    const bonds = readCatalystDailyStatisticsXlsFile(catalystDailyStatisticsFileName);

    bonds.forEach((bond) => {
        const bondDetails: BondDetails = {
            name: bond.name,
            isin: bond.isin,
            issuer: 'n/a',
            type: bond.type,
            nominalValue: bond.nominalValue,
            maturityDay: bond.maturityDay,
            currentInterestRate: bond.currentInterestRate,
            accuredInterest: bond.accuredInterest
        }
        const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019, 0.19);
        const closingPriceYtm = ytmCalculator.forPrice(bond.closingPrice);
        console.log(`Bond: ${bond.name},`
            + ` total price: ${closingPriceYtm.totalBuyingPrice},`
            + ` time to mature: ${closingPriceYtm.timeToMature.toFixed(2)},`
            + ` sale income: ${closingPriceYtm.totalSaleIncome.toFixed(2)},`
            + ` ytm: ${(closingPriceYtm.ytm * 100).toFixed(2)}%`);
    });
}

(async () => {
    await ytm();
})();
