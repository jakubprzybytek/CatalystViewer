import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BondDetailsTable, DbBondDetails } from './storage';
import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from './catalyst';
import { getBondInformation } from './obligacjepl/ObligacjeWebsite';

const dynamoDbClient = new DynamoDBClient({});

async function update() {
  const bonds: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

  const bondDetailsTable = new BondDetailsTable(dynamoDbClient, 'dev-catalyst-viewer-BondDetails');

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
}

(async () => {
  await update();
})();
