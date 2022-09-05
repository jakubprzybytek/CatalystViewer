export type DbBondDetails = {
    name: string;
    market: string;
    issuer: string;
    type: string;
    nominalValue: number;
    maturityDay: Date;
    currentInterestRate: number;
    accuredInterest: number;
};
