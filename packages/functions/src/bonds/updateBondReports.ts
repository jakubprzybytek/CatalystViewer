import * as R from 'ramda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { differenceInBusinessDays, getTime, sub } from 'date-fns';
import { average } from 'simple-statistics'
import { parseUTCDate } from '@catalyst-viewer/core';
import { getSpread, getTurnover } from '@catalyst-viewer/core/bonds/statistics';
import { CatalystBondQuote, CatalystDailyStatisticsBondDetails, getCurrentCatalystBondsQuotes, getLatestCatalystDailyStatistics } from '@catalyst-viewer/core/bonds/catalyst';
import { getBondInformation } from '@catalyst-viewer/core/bonds/obligacjepl';
import { BondDetailsTable, DbBondDetails } from '@catalyst-viewer/core/storage/bondDetails';
import { BondQuotesQuery, BondStatisticsTable, DbBondStatistics } from '@catalyst-viewer/core/storage/bondStatistics';
import { UpdateBondsResult, UpdatedBond } from '.';

const dynamoDbClient = new DynamoDBClient({});

const bondId = (bond: DbBondDetails | CatalystBondQuote | CatalystDailyStatisticsBondDetails): string => `${bond.name}#${bond.market}`;
const mapByBondId = R.reduce((map: Record<string, DbBondDetails | CatalystBondQuote>, curr: DbBondDetails | CatalystBondQuote) => R.assoc(bondId(curr), curr, map), {});

export async function handler(): Promise<UpdateBondsResult> {
  const bondDetailsTable = new BondDetailsTable(dynamoDbClient, Table.BondDetails.tableName);

  const bondsQuotesList: CatalystBondQuote[] = await getCurrentCatalystBondsQuotes();
  await storeBondQuotes(bondsQuotesList);

  const bondsQuotes = mapByBondId(bondsQuotesList) as Record<string, CatalystBondQuote>;

  const bondsFailed: string[] = [];
  const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();

  const storedBondsList: DbBondDetails[] = await bondDetailsTable.getAllActive();
  const storedBonds = mapByBondId(storedBondsList) as Record<string, DbBondDetails>;

  const now = new Date();
  const liquidityStatisticsEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const liquidityStatisticsStartDate = sub(liquidityStatisticsEndDate, { days: 30, hours: 23, minutes: 59, seconds: 59 });
  const newBondsToStore: DbBondDetails[] = [];
  const updatedBondsToStore: DbBondDetails[] = [];

  for (const bondStats of bondsStats) {
    try {
      const currentTime = new Date();

      const storedBondDetails = storedBonds[bondId(bondStats)];
      const bondQuote = bondsQuotes[bondId(bondStats)];

      const liquidityStatistics = await computeLiquidityStatistics(bondStats.name, bondStats.market, liquidityStatisticsStartDate, liquidityStatisticsEndDate);
      console.log(`${bondStats.name} - Avg turnover: ${liquidityStatistics.averageTurnover}, trading days: ${liquidityStatistics.tradingDaysRatio}, avg spread: ${liquidityStatistics.averageSpread}`);

      if (storedBondDetails !== undefined) {
        // update existing bond information
        updatedBondsToStore.push({
          ...storedBondDetails,
          updatedTs: currentTime.getTime(),
          currentInterestRate: bondStats.currentInterestRate,
          accuredInterest: bondStats.accuredInterest,
          referencePrice: bondQuote.referencePrice,
          ...(bondQuote.lastDateTime && { lastDateTime: bondQuote.lastDateTime }),
          ...(bondQuote.lastPrice && { lastPrice: bondQuote.lastPrice }),
          ...(bondQuote.bidCount && { bidCount: bondQuote.bidCount }),
          ...(bondQuote.bidVolume && { bidVolume: bondQuote.bidVolume }),
          ...(bondQuote.bidPrice && { bidPrice: bondQuote.bidPrice }),
          ...(bondQuote.askPrice && { askPrice: bondQuote.askPrice }),
          ...(bondQuote.askVolume && { askVolume: bondQuote.askVolume }),
          ...(bondQuote.askCount && { askCount: bondQuote.askCount }),

          averageTurnover: liquidityStatistics.averageTurnover,
          tradingDaysRatio: liquidityStatistics.tradingDaysRatio,
          averageSpread: liquidityStatistics.averageSpread
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
          referencePrice: bondQuote.referencePrice,
          ...(bondQuote.lastDateTime && { lastDateTime: bondQuote.lastDateTime }),
          ...(bondQuote.lastPrice && { lastPrice: bondQuote.lastPrice }),
          ...(bondQuote.bidCount && { bidCount: bondQuote.bidCount }),
          ...(bondQuote.bidVolume && { bidVolume: bondQuote.bidVolume }),
          ...(bondQuote.bidPrice && { bidPrice: bondQuote.bidPrice }),
          ...(bondQuote.askPrice && { askPrice: bondQuote.askPrice }),
          ...(bondQuote.askVolume && { askVolume: bondQuote.askVolume }),
          ...(bondQuote.askCount && { askCount: bondQuote.askCount }),

          averageTurnover: liquidityStatistics.averageTurnover,
          tradingDaysRatio: liquidityStatistics.tradingDaysRatio,
          averageSpread: liquidityStatistics.averageSpread
        });
      }
    } catch (error: any) {
      bondsFailed.push(bondStats.name);
      console.error(error);
    }
  }

  // look for bonds to deactivate
  const newAndUpdatedBondIdies = bondsStats.map(bondId);
  const deactivatedBondsToStore: DbBondDetails[] = storedBondsList
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
    newBonds: newBondsToStore.map(toUpdatedBond),
    bondsDeactivated: deactivatedBondsToStore.map(toUpdatedBond),
    bondsFailed
  }
}

function toUpdatedBond(dbBond: DbBondDetails): UpdatedBond {
  return {
    name: dbBond.name,
    issuer: dbBond.issuer,
    type: dbBond.type,
    interestVariable: dbBond.interestVariable,
    interestConst: dbBond.interestConst,
    nominalValue: dbBond.nominalValue,
    currency: dbBond.currency
  }
}

  async function storeBondQuotes(bondsQuotesList: CatalystBondQuote[]): Promise<void> {
    const now = new Date();
    const bondStatisticsTable = new BondStatisticsTable(dynamoDbClient, Table.BondStatistics.tableName);

    const bondStatistics: DbBondStatistics[] = bondsQuotesList
      .filter(quote => quote.turnover > 0 || quote.bidPrice != undefined || quote.askPrice != undefined)
      .map(quote => ({
        name: quote.name,
        market: quote.market,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        quotes: [{
          date: now,
          bid: quote.bidPrice,
          ask: quote.askPrice,
          ...(quote.transactions > 0 && { close: quote.lastPrice }),
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

    console.log(`Stored ${bondStatistics.length} quotes.`);
  }

type LiquidityStatistics = {
  averageTurnover?: number;
  tradingDaysRatio: number;
  averageSpread?: number;
}

async function computeLiquidityStatistics(bondName: string, market: string, startDate: Date, endDate: Date): Promise<LiquidityStatistics> {
  const bondStatisticsTable = new BondStatisticsTable(dynamoDbClient, Table.BondStatistics.tableName);
  const bondQuotesQuery = new BondQuotesQuery(bondStatisticsTable);

  const quotes = await bondQuotesQuery.get(bondName, market, startDate, endDate);
  console.log(`Qs: ${JSON.stringify(quotes)}`);
  const turnoverValues = getTurnover(quotes);
  console.log(`T: ${turnoverValues}`);
  const averageTurnover = turnoverValues.length > 0 ? average(turnoverValues) : undefined;
  console.log(`AT: ${averageTurnover}`);
  const spreadValues = getSpread(quotes);
  console.log(`S: ${spreadValues}`);
  const averageSpread = spreadValues.length > 0 ? average(spreadValues) : undefined;
  console.log(`AS: ${averageSpread}`);

  return {
    averageTurnover: averageTurnover !== undefined ? Number(averageTurnover.toFixed(3)) : undefined,
    tradingDaysRatio: Number((turnoverValues.length / differenceInBusinessDays(endDate, startDate)).toFixed(2)),
    averageSpread: averageSpread !== undefined ? Number(averageSpread.toFixed(3)) : undefined,
  }
}
