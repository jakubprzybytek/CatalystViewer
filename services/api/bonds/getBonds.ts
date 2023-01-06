import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { format, differenceInDays } from 'date-fns';
import { lambdaHandler, Success } from "../HandlerProxy";
import { BondDetails } from '../../bonds';
import { BondDetailsTable } from '../../storage/BondDetailsTable';
import { BondReport } from ".";

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondReport[]>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, process.env.BOND_DETAILS_TABLE_NAME);
    const dbBonds = await bondDetailsTable.getAll();

    const bonds = dbBonds.map(dbBond => {
        const bondDetails: BondDetails = {
            name: dbBond.name,
            isin: dbBond.isin,
            issuer: dbBond.issuer,
            market: dbBond.market,
            type: dbBond.type,
            nominalValue: dbBond.nominalValue,
            currency: dbBond.currency,
            maturityDay: dbBond.maturityDay,
            maturityDayTs: dbBond.maturityDayTs,
            interestType: dbBond.interestType,
            interestVariable: dbBond.interestVariable,
            interestConst: dbBond.interestConst,

            currentInterestRate: dbBond.currentInterestRate,
            accuredInterest: dbBond.accuredInterest
        };

        const today = new Date().getTime();

        const interestPeriodIndex = dbBond.interestPayoffDayTss.findIndex(day => day >= today);
        const currentInterestFirstDay = dbBond.interestFirstDayTss[interestPeriodIndex];
        const currentInterestRecordDay = dbBond.interestRightsDayTss[interestPeriodIndex];
        const currentInterestPayableDay = dbBond.interestPayoffDayTss[interestPeriodIndex];

        const currentInterestDays = differenceInDays(new Date(), currentInterestFirstDay) + 1;
        const accumulatedInterest = currentInterestDays * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const currentInterestPeriod = differenceInDays(currentInterestPayableDay, currentInterestFirstDay);
        const nextInterest = currentInterestPeriod * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const accuredInterest = currentInterestRecordDay > today ? accumulatedInterest : 0;

        return {
            details: bondDetails,
            detailsUpdated: dbBond.updated,
            detailsUpdatedTs: dbBond.updatedTs,

            currentInterestFirstDay: currentInterestFirstDay,
            currentInterestRecordDay: currentInterestRecordDay,
            currentInterestPayableDay: currentInterestPayableDay,

            accumulatedInterest: accumulatedInterest,
            accuredInterest: accuredInterest,
            nextInterest: nextInterest,

            ...(dbBond.referencePrice && {
                referencePrice: dbBond.referencePrice
            }),
            ...(dbBond.lastPrice && {
                lastDateTime: dbBond.lastDateTime,
                lastPrice: dbBond.lastPrice,
            }),
            ...(dbBond.bidPrice && dbBond.bidVolume && dbBond.bidCount && {
                bidCount: dbBond.bidCount,
                bidVolume: dbBond.bidVolume,
                bidPrice: dbBond.bidPrice,
            }),
            ...(dbBond.askPrice && dbBond.askVolume && dbBond.askCount && {
                askPrice: dbBond.askPrice,
                askVolume: dbBond.askVolume,
                askCount: dbBond.askCount,
            })
        }
    });

    return Success(bonds);
});
