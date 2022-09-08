import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from 'bonds/catalyst';
import { getBondInformation } from 'bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from 'bonds/storage';

const dynamoDbClient = new DynamoDBClient({});

export async function handler(event: any) {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bonds: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, process.env.BOND_DETAILS_TABLE_NAME);

    const dbBonds: DbBondDetails[] = [];
    for (const bond of bonds) {
        const bondInformation = await getBondInformation(bond.name);

        dbBonds.push({
            name: bond.name,
            isin: bond.isin,
            market: bond.market,
            issuer: bondInformation.issuer,
            type: bond.type,
            nominalValue: bond.nominalValue,
            maturityDay: bond.maturityDay,
            interestType: bondInformation.interestType,
            currentInterestRate: bond.currentInterestRate,
            accuredInterest: bond.accuredInterest,
            closingPrice: bond.closingPrice
        });
    }

    await bondDetailsTable.storeAll(dbBonds);

    return {
        bondsUpdated: bonds.length
    }
}