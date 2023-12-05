export * from './BondStatisticsTable';

type BondQuote = {
  date: Date;
  bid: number;
  ask: number;
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
