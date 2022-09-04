import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { downloadLatestCatalystDailyStatistics } from "./catalyst/CatalystSDK";
import { readCatalystDailyStatisticsXlsFile } from "bonds/catalyst/CatalystDailyStatisticsXlsFile";
import { BondDetailsTable } from './storage/BondDetailsTable';

const dynamoDbClient = new DynamoDBClient({});

async function update() {
  const catalystDailyStatisticsFileName = await downloadLatestCatalystDailyStatistics();
  const bonds = readCatalystDailyStatisticsXlsFile(catalystDailyStatisticsFileName);

  const bondDetailsTable = new BondDetailsTable(dynamoDbClient);

  const dbBonds = bonds.map((bond) => ({
    name: bond.name,
    market: bond.market,
    issuer: 'n/a'
  }));

  await bondDetailsTable.storeAll(dbBonds);
}

(async () => {
  await update();
})();
