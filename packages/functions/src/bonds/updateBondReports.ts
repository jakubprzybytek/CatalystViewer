import * as R from 'ramda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { parseUTCDate } from '@catalyst-viewer/core';
import { getTime } from 'date-fns';
import { CatalystBondQuote, CatalystDailyStatisticsBondDetails, getCurrentCatalystBondsQuotes, getLatestCatalystDailyStatistics } from '@catalyst-viewer/core/bonds/catalyst';
import { getBondInformation } from '@catalyst-viewer/core/bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from '@catalyst-viewer/core/storage/bondDetails';
import { BondQuotesQuery, BondStatisticsTable, DbBondStatistics } from '@catalyst-viewer/core/storage/bondStatistics';
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

  await storeBondQuotes(bondsQuotesList);

  return {
    bondsUpdated: updatedBondsToStore.length,
    newBonds: [], //newBondsToStore,
    bondsDeactivated: deactivatedBondsToStore,
    bondsFailed
  }
}

async function storeBondQuotes(bondsQuotesList: CatalystBondQuote[]): Promise<void> {
  const now = new Date();
  const bondStatisticsTable = new BondStatisticsTable(dynamoDbClient, Table.BondStatistics.tableName);

  const bondStatistics: DbBondStatistics[] = bondsQuotesList
    .filter(quote => quote.transactions > 0)
    .map(quote => ({
      name: quote.name,
      market: quote.market,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      quotes: [{
        date: now,
        bid: quote.bidPrice,
        ask: quote.askPrice,
        close: quote.lastPrice,
        transactions: quote.transactions,
        volume: quote.volume,
        turnover: quote.turnover
      }]
    }));

  for (const bondQuote of bondStatistics) {
    const updated = await bondStatisticsTable.updateQuotes(bondQuote);
    if (!updated) {
      console.log('Item not existing yet. Creating.')
      await bondStatisticsTable.store(bondQuote);
    }
  };

  const bondQuotesQuery = new BondQuotesQuery(bondStatisticsTable);
  for (const bondQuote of bondStatistics) {
    const quotes = await bondQuotesQuery.get(bondQuote.name, bondQuote.market, new Date('2023-12-04'), new Date('2023-12-15 23:59:59.999'));
    console.log(quotes.map(quote => quote.date));
  }

  console.log(`Stored ${bondStatistics.length} quotes.`);
}
