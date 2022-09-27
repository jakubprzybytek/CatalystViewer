export * from './ObligacjeWebsite';

export type ObligacjeBondInformation = {
    name: string;
    issuer: string;
    market: string;
    emissionValue: number;
    nominalValue: number;
    interestType: string;
    currency: string;
    interestFirstDays: string[];
    interestPayoffDays: string[];
};
