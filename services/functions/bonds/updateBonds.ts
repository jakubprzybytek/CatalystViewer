import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from 'bonds/catalyst';
import { getBondInformation } from 'bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from 'bonds/storage';

const dynamoDbClient = new DynamoDBClient({});

export async function handler(event: any) {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, process.env.BOND_DETAILS_TABLE_NAME);

    const dbBonds: DbBondDetails[] = [];
    for (const bondStats of bondsStats) {
        const bondInformation = await getBondInformation(bondStats.name);

        dbBonds.push({
            name: bondStats.name,
            isin: bondStats.isin,
            market: bondStats.market,
            issuer: bondInformation.issuer,
            type: bondStats.type,
            nominalValue: bondStats.nominalValue,
            currency: bondStats.tradingCurrency,
            maturityDay: bondStats.maturityDay,
            interestType: bondInformation.interestType,
            currentInterestRate: bondStats.currentInterestRate,
            accuredInterest: bondStats.accuredInterest,
            closingPrice: bondStats.closingPrice,
            interestFirstDays: bondInformation.interestFirstDays,
            interestPayoffDays: bondInformation.interestPayoffDays
        });
    }

    await bondDetailsTable.storeAll(dbBonds);

    return {
        bondsUpdated: bondsStats.length
    }
}