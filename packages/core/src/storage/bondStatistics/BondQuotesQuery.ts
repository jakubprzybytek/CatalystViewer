import { BondQuote, BondStatisticsTable } from ".";

export class BondQuotesQuery {
  readonly bondStatisticsTable: BondStatisticsTable;

  constructor(bondStatisticsTable: BondStatisticsTable) {
    this.bondStatisticsTable = bondStatisticsTable;
  }

  // assuming that start and end are either in the same month or in two consecutive months
  async get(bondName: string, market: string, start: Date, end: Date): Promise<BondQuote[]> {
    const bondId = `${bondName}#${market}`;

    const quotes: BondQuote[] = [];
    const startDateBondStatistics = await this.bondStatisticsTable.get(bondId, start.getFullYear(), start.getMonth() + 1);
    startDateBondStatistics?.quotes
      .filter(quote => start <= quote.date && quote.date <= end)
      .forEach(quote => quotes.push(quote));

    if (start.getFullYear() != end.getFullYear()) {
      const endDateBondStatistics = await this.bondStatisticsTable.get(bondId, end.getFullYear(), end.getMonth() + 1);
      endDateBondStatistics?.quotes
        .filter(quote => quote.date <= end)
        .forEach(quote => quotes.push(quote));
    }

    return quotes;
  }

}
