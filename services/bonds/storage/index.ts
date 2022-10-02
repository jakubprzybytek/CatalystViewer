export * from './BondDetailsTable';

export type DbBondDetails = {
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    currency: string;
    maturityDay: Date;
    interestType: string;
    currentInterestRate: number;
    accuredInterest: number;
    closingPrice: number;
    interestFirstDays: string[];
    interestPayoffDays: string[];
};
