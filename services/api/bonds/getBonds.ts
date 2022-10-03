import { lambdaHandler, Success } from "../HandlerProxy";
import { parse, format, isAfter } from 'date-fns';
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

        const interestFirstDays: Date[] = dbBond.interestFirstDays.map((dateString) => parse(dateString, 'yyyy-MM-dd', 0));
        const interestPayoffDays: Date[] = dbBond.interestPayoffDays.map((dateString) => parse(dateString, 'yyyy-MM-dd', 0));

        const today = new Date();
        const previousInterestPayoffDay = interestFirstDays.reverse().find((firstDay) => isAfter(today, firstDay));
        const nextInterestPayoffDay = interestPayoffDays.find((payoffDay) => isAfter(payoffDay, today));

        const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019);

        return {
            details: bondDetails,
            detailsUpdated: dbBond.updated,
            closingPrice: dbBond.closingPrice,
            closingPriceNetYtm: ytmCalculator.forPrice(dbBond.closingPrice, 0.19),
            closingPriceGrossYtm: ytmCalculator.forPrice(dbBond.closingPrice, 0),
            previousInterestPayoffDay: previousInterestPayoffDay ? format(previousInterestPayoffDay, 'yyyy-MM-dd') : 'n/a',
            nextInterestPayoffDay: nextInterestPayoffDay ? format(nextInterestPayoffDay, 'yyyy-MM-dd') : 'n/a'
        }
    });

    return Success(bonds);
});
