export * from './CatalystDailyStatisticsXlsFile';
export * from './CorporateBondsQuotesPage';

export type CatalystDailyStatisticsBondDetails = {
    readonly name: string;
    readonly isin: string;
    readonly type: string;
    readonly market: string;
    readonly nominalValue: number;
    readonly maturityDay: Date;
    readonly currentInterestRate: number;
    readonly accuredInterest: number;
    readonly tradingCurrency: string;
    readonly closingPrice: number;
};

export type CatalystBondQuery = {
    readonly name: string;
    readonly market: string;
    readonly referencePrice: number;
    readonly bidCount: number;
    readonly bidVolume: number;
    readonly bid: number;
    readonly ask: number;
    readonly askVolume: number;
    readonly askCount: number;
    readonly currency: string;
};
