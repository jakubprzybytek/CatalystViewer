import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from '../../bonds/catalyst';
import { getBondInformation } from '../../bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from '../../storage';

const dynamoDbClient = new DynamoDBClient({});

const bondId = (bond: DbBondDetails) => `${bond.name}#${bond.market}`;

export async function handler(event: any) {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const currentTime = new Date().toISOString();
    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, process.env.BOND_DETAILS_TABLE_NAME);

    const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

    const bondsToStore: DbBondDetails[] = [];
    for (const bondStats of bondsStats) {
        const bondInformation = await getBondInformation(bondStats.name);

        bondsToStore.push({
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
            interestType: bondInformation.interestType,
            interestVariable: bondInformation.interestVariable,
            interestConst: bondInformation.interestConst,
            currentInterestRate: bondStats.currentInterestRate,
            accuredInterest: bondStats.accuredInterest,
            closingPrice: bondStats.closingPrice,
            interestFirstDays: bondInformation.interestFirstDays,
            interestPayoffDays: bondInformation.interestPayoffDays
        });
    }

    const newAndUpdatedBondsIdies = bondsToStore.map(bondId);

    const storedBonds = await bondDetailsTable.getAll();
    const storedBondsIdies = storedBonds.map(bondId);

    const newBonds = bondsToStore
        .filter((bondToStore) => !storedBondsIdies.includes(bondId(bondToStore)));

    const bondsToDeactivate = storedBonds
        .filter((storedBond) => !newAndUpdatedBondsIdies.includes(bondId(storedBond)));

    bondsToDeactivate.forEach((bondToDeactivate) => {
        bondsToStore.push({
            ...bondToDeactivate,
            status: 'inactive'
        })
    });

    await bondDetailsTable.storeAll(bondsToStore);

    return {
        bondsUpdated: bondsToStore.length,
        newBonds: newBonds.map((bond) => bond.name),
        bondsDeactivated: bondsToDeactivate.map((bond) => bond.name)
    }
}