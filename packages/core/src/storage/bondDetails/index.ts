export * from './BondDetailsTable';

export type DbBondDetails = {
    status: string;
    updatedTs: number;
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;      // current, from the Catalyst file (falls with instalment redemptions; IZ bonds: indexed)
    issueValue: number;        // from obligacje.pl when the bond was first seen, at that day's nominal
    issuedNominal?: number;    // the nominal on that day: bonds in circulation = issueValue / issuedNominal
    currency: string;
    maturityDay: Date;
    maturityDayTs: number;
    interestType: string;
    interestVariable: string | undefined;
    interestConst: number;
    interestFirstDays: string[];
    interestFirstDayTss: number[];
    interestRightsDays: string[];
    interestRightsDayTss: number[];
    interestPayoffDays: string[];
    interestPayoffDayTss: number[];

    currentInterestRate: number;
    accuredInterest: number;
    referencePrice?: number;
    lastDateTime?: string;
    lastPrice?: number;
    bidCount?: number;
    bidVolume?: number;
    bidPrice?: number;
    askPrice?: number;
    askVolume?: number;
    askCount?: number;

    averageTurnover?: number;
    tradingDaysRatio: number;
    averageSpread?: number;
};
