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

export type CatalystBondQuote = {
    readonly name: string;
    readonly market: string;
    readonly referencePrice: number;
    readonly lastDateTime: string;
    readonly lastPrice: number;
    readonly bidCount: number;
    readonly bidVolume: number;
    readonly bidPrice: number;
    readonly askPrice: number;
    readonly askVolume: number;
    readonly askCount: number;
    readonly transactions: number;
    readonly volume: number;
    readonly turnover: number;
    readonly currency: string;
};
