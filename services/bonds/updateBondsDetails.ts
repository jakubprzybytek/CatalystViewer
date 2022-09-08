import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BondDetailsTable, DbBondDetails } from './storage';
import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from './catalyst';

const dynamoDbClient = new DynamoDBClient({});

async function update() {
  const bonds: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

  const bondDetailsTable = new BondDetailsTable(dynamoDbClient, 'int-catalyst-viewer-BondDetails');

  const dbBonds: DbBondDetails[] = bonds.map((bond) => ({
    name: bond.name,
    isin: bond.isin,
    market: bond.market,
    issuer: 'n/a',
    type: bond.type,
    nominalValue: bond.nominalValue,
    maturityDay: bond.maturityDay,
    currentInterestRate: bond.currentInterestRate,
    accuredInterest: bond.accuredInterest,
    closingPrice: bond.closingPrice
  }));

  await bondDetailsTable.storeAll(dbBonds);
}

(async () => {
  await update();
})();
