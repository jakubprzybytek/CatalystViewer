export * from './CatalystWebsite';

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
