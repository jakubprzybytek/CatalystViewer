export * from './BondStatisticsTable';
export * from './BondQuotesQuery';

export type BondQuote = {
  date: Date;
  close: number;
  transactions: number;
  volume: number;
  turnover: number;
}

export type DbBondStatistics = {
  name: string;
  market: string;
  year: number;
  month: number;
  quotes: BondQuote[];
}
