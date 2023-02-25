export * from './BondDetailsTable';

export type DbBondDetails = {
    status: string;
    updated: string;
    updatedTs: number;
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    issueValue: number;
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
};
