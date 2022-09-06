export * from './BondDetailsTable';

export type DbBondDetails = {
    name: string;
    isin: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    maturityDay: Date;
    currentInterestRate: number;
    accuredInterest: number;
};
