import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { format, differenceInDays } from 'date-fns';
import { lambdaHandler, Success } from "../HandlerProxy";
import { BondDetails } from '../../bonds';
import { BondDetailsTable } from '../../storage/BondDetailsTable';
import { YieldToMaturityCalculator } from '../../bonds/formulas/YieldToMaturity';
import { BondReport } from ".";

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondReport[]>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, process.env.BOND_DETAILS_TABLE_NAME);
    const dbBonds = await bondDetailsTable.getAll();

    const bonds = dbBonds.map((dbBond) => {
        const bondDetails: BondDetails = {
            name: dbBond.name,
            isin: dbBond.isin,
            issuer: dbBond.issuer,
            market: dbBond.market,
            type: dbBond.type,
            nominalValue: dbBond.nominalValue,
            currency: dbBond.currency,
            maturityDay: dbBond.maturityDay,
            interestType: dbBond.interestType,
            interestVariable: dbBond.interestVariable,
            interestConst: dbBond.interestConst,
            currentInterestRate: dbBond.currentInterestRate,
            accuredInterest: dbBond.accuredInterest
        };

        const today = new Date().getTime();
        const currentInterestPeriodFirstDay = dbBond.interestFirstDayTss.reverse().find((day) => today >= day);
        const nextInterestRightsDay = dbBond.interestRightsDayTss.find((day) => day >= today);
        const nextInterestPayoffDay = dbBond.interestPayoffDayTss.find((day) => day >= today);

        const currentInterestDays = currentInterestPeriodFirstDay
            && differenceInDays(new Date(), currentInterestPeriodFirstDay) + 1;
        const accumulatedInterest = currentInterestDays
            && currentInterestDays * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const nextInterestPeriod = currentInterestPeriodFirstDay && nextInterestPayoffDay
            && differenceInDays(nextInterestPayoffDay, currentInterestPeriodFirstDay);
        const nextInterest = nextInterestPeriod
            && nextInterestPeriod * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const accuredInterest = nextInterestRightsDay && nextInterestPayoffDay
            && nextInterestRightsDay < nextInterestPayoffDay ? accumulatedInterest : 0;

        const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019);

        return {
            details: bondDetails,
            detailsUpdated: dbBond.updated,

            currentInterestPeriodFirstDay: currentInterestPeriodFirstDay ? format(currentInterestPeriodFirstDay, 'yyyy-MM-dd') : 'n/a',
            nextInterestRightsDay: nextInterestRightsDay ? format(nextInterestRightsDay, 'yyyy-MM-dd') : 'n/a',
            nextInterestPayoffDay: nextInterestPayoffDay ? format(nextInterestPayoffDay, 'yyyy-MM-dd') : 'n/a',
            accumulatedInterest: accumulatedInterest || 0,
            accuredInterest: accuredInterest || 0,
            nextInterest: nextInterest || 0,

            ...(dbBond.referencePrice && {
                referencePrice: dbBond.referencePrice,
                referencePriceNetYtm: ytmCalculator.forPrice(dbBond.referencePrice, 0.19),
                referencePriceGrossYtm: ytmCalculator.forPrice(dbBond.referencePrice, 0),
            }),
            ...(dbBond.lastPrice && {
                lastDateTime: dbBond.lastDateTime,
                lastPrice: dbBond.lastPrice,
                lastPriceNetYtm: ytmCalculator.forPrice(dbBond.lastPrice, 0.19),
                lastPriceGrossYtm: ytmCalculator.forPrice(dbBond.lastPrice, 0)
            }),
            ...(dbBond.bidPrice && dbBond.bidVolume && dbBond.bidCount && {
                bidCount: dbBond.bidCount,
                bidVolume: dbBond.bidVolume,
                bidPrice: dbBond.bidPrice,
                bidPriceNetYtm: ytmCalculator.forPrice(dbBond.bidPrice, 0.19),
                bidPriceGrossYtm: ytmCalculator.forPrice(dbBond.bidPrice, 0)
            }),
            ...(dbBond.askPrice && dbBond.askVolume && dbBond.askCount && {
                askPrice: dbBond.askPrice,
                askVolume: dbBond.askVolume,
                askCount: dbBond.askCount,
                askPriceNetYtm: ytmCalculator.forPrice(dbBond.askPrice, 0.19),
                askPriceGrossYtm: ytmCalculator.forPrice(dbBond.askPrice, 0)
            }),
        }
    });

    return Success(bonds);
});
