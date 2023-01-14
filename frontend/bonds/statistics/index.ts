export * from './BondsData';
export * from './BondsStatistics';

export type InterestByBaseTypePercentiles = Record<string, number[]>;
export type BondsStatistics = {
    all: InterestByBaseTypePercentiles;
    byType: Record<string, InterestByBaseTypePercentiles>;
}