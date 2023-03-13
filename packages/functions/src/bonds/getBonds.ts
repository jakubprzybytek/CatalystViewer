import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { differenceInDays } from 'date-fns';
import { lambdaHandler, Success } from "../HandlerProxy";
import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { BondDetailsTable } from '@catalyst-viewer/core/storage';
import { BondReportsQueryResult } from ".";

const dynamoDBClient = new DynamoDBClient({});

const cachedBondTypes: string[] = [];

export const handler = lambdaHandler<BondReportsQueryResult>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bondTypeFilter = event.pathParameters?.['bondType'];
    console.log(`Requested active bond reports, type=${bondTypeFilter}`);

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, process.env.BOND_DETAILS_TABLE_NAME);

    const dbBonds = bondTypeFilter ? await bondDetailsTable.getActive(bondTypeFilter) : await bondDetailsTable.getAllActive();

    if (cachedBondTypes.length == 0) {
        const bondTypes = await bondDetailsTable.getAllTypes();
        bondTypes.forEach(bondType => cachedBondTypes.push(bondType));
    } else {
        console.log(`Using cached bond types (${cachedBondTypes.length})`);
    }

    const today = new Date().getTime();

    const bondReports = dbBonds.map(dbBond => {
        const details: BondDetails = {
            name: dbBond.name,
            isin: dbBond.isin,
            issuer: dbBond.issuer,
            market: dbBond.market,
            type: dbBond.type,
            nominalValue: dbBond.nominalValue,
            issueValue: dbBond.issueValue,
            currency: dbBond.currency,
            maturityDayTs: dbBond.maturityDayTs,
            interestType: dbBond.interestType,
            interestVariable: dbBond.interestVariable,
            interestConst: dbBond.interestConst,
        };

        const daysToMaturity = differenceInDays(dbBond.maturityDayTs, today);

        const interestPeriodIndex = dbBond.interestPayoffDayTss.findIndex(day => day >= today);
        const currentInterestFirstDay = dbBond.interestFirstDayTss[interestPeriodIndex];
        const currentInterestRecordDay = dbBond.interestRightsDayTss[interestPeriodIndex];
        const currentInterestPayableDay = dbBond.interestPayoffDayTss[interestPeriodIndex];

        const currentInterestDays = differenceInDays(today, currentInterestFirstDay) + 1;
        const accumulatedInterest = currentInterestDays * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const currentInterestPeriod = differenceInDays(currentInterestPayableDay, currentInterestFirstDay);
        const periodInterest = currentInterestPeriod * dbBond.nominalValue * dbBond.currentInterestRate / 100 / 365;
        const accuredInterest = currentInterestRecordDay > today ? accumulatedInterest : 0;

        const currentValues: BondCurrentValues = {
            yearsToMaturity: daysToMaturity / 365,
            interestFirstDay: currentInterestFirstDay,
            interestRecordDay: currentInterestRecordDay,
            interestPayableDay: currentInterestPayableDay,
            interestRate: dbBond.currentInterestRate,
            accuredInterest,
            periodInterest
        };

        return {
            details: details,
            currentValues: currentValues,

            detailsUpdatedTs: dbBond.updatedTs,

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

    return Success({
        bondReports,
        facets: {
            type: cachedBondTypes
        }
    });
});
