export * from './BondStatisticsTable';

export type DbBondStatistics = {
  name: string;
  market: string;
  year: number;
  month: number;
  quotes: string;
}