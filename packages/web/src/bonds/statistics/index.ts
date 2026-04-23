export * from './BondsData';
export * from './BondsStatistics';
export * from './QuotesStatistics';
export * from './Bonds2dStats';

export type InterestPercentilesByInterestBaseType = Record<string, number[]>;
export type BondsStatistics = {
    all: InterestPercentilesByInterestBaseType;
    byType: Record<string, InterestPercentilesByInterestBaseType>;
}