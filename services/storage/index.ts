export * from './BondDetailsTable';

export type DbBondDetails = {
    status: string;
    updated: string;
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    currency: string;
    maturityDay: Date;
    maturityDayTs: number;
    interestType: string;
    interestVariable: string | undefined;
    interestConst: number;
    currentInterestRate: number;
    accuredInterest: number;
    closingPrice: number;
    interestFirstDays: string[];
    interestFirstDayTss: number[];
    interestRightsDays: string[];
    interestRightsDayTss: number[];
    interestPayoffDays: string[];
    interestPayoffDayTss: number[];
};
