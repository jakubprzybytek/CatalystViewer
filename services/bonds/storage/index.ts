export * from './BondDetailsTable';

export type DbBondDetails = {
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    maturityDay: Date;
    interestType: string;
    currentInterestRate: number;
    accuredInterest: number;
    closingPrice: number;
};
