import * as R from 'ramda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { parseUTCDate } from '@catalyst-viewer/core';
import { getTime } from 'date-fns';
import { CatalystBondQuote, CatalystDailyStatisticsBondDetails, getCurrentCatalystBondsQuotes, getLatestCatalystDailyStatistics } from '@catalyst-viewer/core/bonds/catalyst';
import { getBondInformation } from '@catalyst-viewer/core/bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from '@catalyst-viewer/core/storage/bondDetails';
import { UpdateBondsResult } from '.';

const dynamoDbClient = new DynamoDBClient({});

const bondId = (bond: DbBondDetails | CatalystBondQuote | CatalystDailyStatisticsBondDetails): string => `${bond.name}#${bond.market}`;
const mapByBondId = R.reduce((map: Record<string, DbBondDetails | CatalystBondQuote>, curr: DbBondDetails | CatalystBondQuote) => R.assoc(bondId(curr), curr, map), {});

export async function handler(): Promise<UpdateBondsResult> {
  const bondDetailsTable = new BondDetailsTable(dynamoDbClient, Table.BondDetails.tableName);
  
  const bondsFailed: string[] = [];
  const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

  const bondsQuotesList: CatalystBondQuote[] = await getCurrentCatalystBondsQuotes();
  const bondsQuotes = mapByBondId(bondsQuotesList) as Record<string, CatalystBondQuote>;

  const storedBondsList: DbBondDetails[] = await bondDetailsTable.getAllActive();
  const storedBonds = mapByBondId(storedBondsList) as Record<string, DbBondDetails>;

  const newBondsToStore: DbBondDetails[] = [];
  const updatedBondsToStore: DbBondDetails[] = [];

  for (const bondStats of bondsStats) {
    try {
      const storedBond = storedBonds[bondId(bondStats)];
      const bondQuotes = bondsQuotes[bondId(bondStats)];

      const currentTime = new Date();

      if (storedBond !== undefined) {
        // update existing bond information
        updatedBondsToStore.push({
          ...storedBond,
          updatedTs: currentTime.getTime(),
          currentInterestRate: bondStats.currentInterestRate,
          accuredInterest: bondStats.accuredInterest,
          referencePrice: bondQuotes.referencePrice,
          ...(bondQuotes.lastDateTime && { lastDateTime: bondQuotes.lastDateTime }),
          ...(bondQuotes.lastPrice && { lastPrice: bondQuotes.lastPrice }),
          ...(bondQuotes.bidCount && { bidCount: bondQuotes.bidCount }),
          ...(bondQuotes.bidVolume && { bidVolume: bondQuotes.bidVolume }),
          ...(bondQuotes.bidPrice && { bidPrice: bondQuotes.bidPrice }),
          ...(bondQuotes.askPrice && { askPrice: bondQuotes.askPrice }),
          ...(bondQuotes.askVolume && { askVolume: bondQuotes.askVolume }),
          ...(bondQuotes.askCount && { askCount: bondQuotes.askCount })
        });
      } else {
        // create new bond information record
        const bondInformation = await getBondInformation(bondStats.name);

        newBondsToStore.push({
          status: 'active',
          name: bondStats.name,
          isin: bondStats.isin,
          market: bondStats.market,
          issuer: bondInformation.issuer,
          type: bondStats.type,
          nominalValue: bondStats.nominalValue,
          issueValue: bondInformation.issueValue,
          currency: bondStats.tradingCurrency,
          maturityDay: bondStats.maturityDay,
          maturityDayTs: bondStats.maturityDay.getTime(),
          interestType: bondInformation.interestType,
          interestVariable: bondInformation.interestVariable,
          interestConst: bondInformation.interestConst,
          interestFirstDays: bondInformation.interestFirstDays,
          interestFirstDayTss: bondInformation.interestFirstDays.map(parseUTCDate).map(getTime),
          interestRightsDays: bondInformation.interestRightsDays,
          interestRightsDayTss: bondInformation.interestRightsDays.map(parseUTCDate).map(getTime),
          interestPayoffDays: bondInformation.interestPayoffDays,
          interestPayoffDayTss: bondInformation.interestPayoffDays.map(parseUTCDate).map(getTime),

          updatedTs: currentTime.getTime(),
          currentInterestRate: bondStats.currentInterestRate,
          accuredInterest: bondStats.accuredInterest,
          referencePrice: bondQuotes.referencePrice,
          ...(bondQuotes.lastDateTime && { lastDateTime: bondQuotes.lastDateTime }),
          ...(bondQuotes.lastPrice && { lastPrice: bondQuotes.lastPrice }),
          ...(bondQuotes.bidCount && { bidCount: bondQuotes.bidCount }),
          ...(bondQuotes.bidVolume && { bidVolume: bondQuotes.bidVolume }),
          ...(bondQuotes.bidPrice && { bidPrice: bondQuotes.bidPrice }),
          ...(bondQuotes.askPrice && { askPrice: bondQuotes.askPrice }),
          ...(bondQuotes.askVolume && { askVolume: bondQuotes.askVolume }),
          ...(bondQuotes.askCount && { askCount: bondQuotes.askCount })
        });
      }
    } catch (error: any) {
      bondsFailed.push(bondStats.name);
      console.error(error);
    }
  }

  // look for bonds to deactivate
  const newAndUpdatedBondIdies = bondsStats.map(bondId);
  const deactivatedBondsToStore = storedBondsList
    .filter(bond => !newAndUpdatedBondIdies.includes(bondId(bond)))
    .map(bond => ({
      ...bond,
      status: 'inactive'
    }));

  await bondDetailsTable.storeAll(updatedBondsToStore
    .concat(newBondsToStore)
    .concat(deactivatedBondsToStore));

  return {
    bondsUpdated: updatedBondsToStore.length,
    newBonds: [], //newBondsToStore,
    bondsDeactivated: deactivatedBondsToStore,
    bondsFailed
  }
}
