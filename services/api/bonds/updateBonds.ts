import * as R from 'ramda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { parseUTCDate } from 'bonds';
import { getTime } from 'date-fns';
import { CatalystBondQuery as CatalystBondQuote, CatalystDailyStatisticsBondDetails, getCurrentCatalystBondsQuotes, getLatestCatalystDailyStatistics } from '../../bonds/catalyst';
import { getBondInformation } from '../../bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from '../../storage';

const dynamoDbClient = new DynamoDBClient({});

const bondDbId = (bond: DbBondDetails): string => `${bond.name}#${bond.market}`;
const bondStatId = (bond: CatalystDailyStatisticsBondDetails): string => `${bond.name}#${bond.market}`;
const mapByBondId = R.reduce((map: Record<string, DbBondDetails>, curr: DbBondDetails) => R.assoc(bondDbId(curr), curr, map), {});

export async function handler(event: any) {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const currentTime = new Date().toISOString();
    const bondsFailed: string[] = [];

    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, process.env.BOND_DETAILS_TABLE_NAME);

    const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();
    //const bondsQuotes: CatalystBondQuote[] = await getCurrentCatalystBondsQuotes();

    const storedBondsList: DbBondDetails[] = await bondDetailsTable.getAll();
    const storedBonds: Record<string, DbBondDetails> = mapByBondId(storedBondsList);

    const newBondsToStore: DbBondDetails[] = [];
    const updatedBondsToStore: DbBondDetails[] = [];

    for (const bondStats of bondsStats) {
        try {
            const storedBond = storedBonds[bondStatId(bondStats)];

            if (storedBond !== undefined) {
                // update existing bond information
                updatedBondsToStore.push({
                    ...storedBond,
                    updated: currentTime,
                    currentInterestRate: bondStats.currentInterestRate,
                    accuredInterest: bondStats.accuredInterest,
                    closingPrice: bondStats.closingPrice,
                });
            } else {
                // create new bond information record
                const bondInformation = await getBondInformation(bondStats.name);

                newBondsToStore.push({
                    status: 'active',
                    updated: currentTime,
                    name: bondStats.name,
                    isin: bondStats.isin,
                    market: bondStats.market,
                    issuer: bondInformation.issuer,
                    type: bondStats.type,
                    nominalValue: bondStats.nominalValue,
                    currency: bondStats.tradingCurrency,
                    maturityDay: bondStats.maturityDay,
                    maturityDayTs: bondStats.maturityDay.getTime(),
                    interestType: bondInformation.interestType,
                    interestVariable: bondInformation.interestVariable,
                    interestConst: bondInformation.interestConst,
                    currentInterestRate: bondStats.currentInterestRate,
                    accuredInterest: bondStats.accuredInterest,
                    closingPrice: bondStats.closingPrice,
                    interestFirstDays: bondInformation.interestFirstDays,
                    interestFirstDayTss: bondInformation.interestFirstDays.map(parseUTCDate).map(getTime),
                    interestRightsDays: bondInformation.interestRightsDays,
                    interestRightsDayTss: bondInformation.interestRightsDays.map(parseUTCDate).map(getTime),
                    interestPayoffDays: bondInformation.interestPayoffDays,
                    interestPayoffDayTss: bondInformation.interestPayoffDays.map(parseUTCDate).map(getTime)
                });
            }
        } catch (error: any) {
            bondsFailed.push(bondStats.name);
            console.error(error);
        }
    }

    // look for bonds to deactivate
    const newAndUpdatedBondIdies = bondsStats.map(bondStatId);
    const deactivatedBondsToStore = storedBondsList
        .filter(bond => !newAndUpdatedBondIdies.includes(bondDbId(bond)))
        .map(bond => ({
            ...bond,
            status: 'inactive'
        }));

    bondDetailsTable.storeAll(updatedBondsToStore
        .concat(newBondsToStore)
        .concat(deactivatedBondsToStore));

    return {
        bondsUpdated: updatedBondsToStore.length,
        newBonds: newBondsToStore.map(bond => bond.name),
        bondsDeactivated: deactivatedBondsToStore.map(bond => bond.name),
        bondsFailed
    }
}