export * from './BondDetailsTable';

export type DbBondDetails = {
    updated: string;
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    currency: string;
    maturityDay: Date;
    interestType: string;
    interestVariable: string | undefined;
    interestConst: number;
    currentInterestRate: number;
    accuredInterest: number;
    closingPrice: number;
    interestFirstDays: string[];
    interestPayoffDays: string[];
};
