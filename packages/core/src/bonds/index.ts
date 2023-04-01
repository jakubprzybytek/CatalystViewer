export type BondDetails = {
    readonly name: string;
    readonly isin: string;
    readonly issuer: string;
    readonly market: string;
    readonly type: string;
    readonly nominalValue: number;
    readonly issueValue: number;
    readonly currency: string;
    readonly firstDayTs: number;
    readonly maturityDayTs: number;
    readonly interestType: string;
    readonly interestVariable: string | undefined;
    readonly interestConst: number;
}

export type BondCurrentValues = {
    readonly yearsToMaturity: number;

    readonly interestFirstDay: number;
    readonly interestRecordDay: number;
    readonly interestPayableDay: number;
    readonly interestProgress: number;

    readonly interestRate: number;
    readonly accuredInterest: number;
    readonly periodInterest: number;
}
