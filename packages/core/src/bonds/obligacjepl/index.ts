export * from './ObligacjeWebsite';

export type InterestType = {
    variable: string | undefined;
    const: number;
};

export type InterestPeriod = {
    firstDay: string;
    rightsDay: string;
    payoffDay: string;
}

export type ObligacjeBondInformation = {
    name: string;
    issuer: string;
    market: string;
    nominalValue: number;
    issueValue: number;
    interestType: string;
    interestVariable: string | undefined;
    interestConst: number;
    currency: string;
    interestFirstDays: string[];
    interestRightsDays: string[];
    interestPayoffDays: string[];
    interestPeriods: InterestPeriod[];
};
