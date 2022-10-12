import { lambdaHandler, Success } from "../HandlerProxy";
import { format, isAfter, differenceInDays } from 'date-fns';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
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
            maturityDay: dbBond.maturityDay,
            interestType: dbBond.interestType,
            interestVariable: dbBond.interestVariable,
            interestConst: dbBond.interestConst,
            currentInterestRate: dbBond.currentInterestRate,
            accuredInterest: dbBond.accuredInterest
        };

        const interestFirstDays: Date[] = dbBond.interestFirstDayTss.map((ts) => new Date(ts));
        const interestPayoffDays: Date[] = dbBond.interestPayoffDayTss.map((ts) => new Date(ts));

        const today = new Date();
        const previousInterestPayoffDay = interestFirstDays.reverse().find((firstDay) => isAfter(today, firstDay));
        const nextInterestPayoffDay = interestPayoffDays.find((payoffDay) => isAfter(payoffDay, today));

        const currentInterestDays = previousInterestPayoffDay
            && differenceInDays(new Date(), previousInterestPayoffDay) + 1;
        const accuredInterest = currentInterestDays
            && currentInterestDays * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const nextInterestPeriod = previousInterestPayoffDay && nextInterestPayoffDay
            && differenceInDays(nextInterestPayoffDay, previousInterestPayoffDay) + 1;
        const nextInterest = nextInterestPeriod
            && nextInterestPeriod * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;

        const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019);
//        console.log(`${format(previousInterestPayoffDay || new Date(), 'yyyy-MM-dd')} ${format(nextInterestPayoffDay || new Date(), 'yyyy-MM-dd')}`)
//        console.log(`curr ${currentInterestDays} next period ${nextInterestPeriod}`)
//        console.log(`Acc: ${dbBond.accuredInterest}, com acc: ${accuredInterest}, nex:${nextInterest}`)
        return {
            details: bondDetails,
            detailsUpdated: dbBond.updated,
            closingPrice: dbBond.closingPrice,
            closingPriceNetYtm: ytmCalculator.forPrice(dbBond.closingPrice, 0.19),
            closingPriceGrossYtm: ytmCalculator.forPrice(dbBond.closingPrice, 0),
            previousInterestPayoffDay: previousInterestPayoffDay ? format(previousInterestPayoffDay, 'yyyy-MM-dd') : 'n/a',
            accuredInterest: accuredInterest || 0,
            nextInterestPayoffDay: nextInterestPayoffDay ? format(nextInterestPayoffDay, 'yyyy-MM-dd') : 'n/a',
            nextInterest: nextInterest || 0
        }
    });

    return Success(bonds);
});
