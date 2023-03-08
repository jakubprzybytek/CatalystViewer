export type BondDetails = {
    readonly name: string;
    readonly isin: string;
    readonly issuer: string;
    readonly market: string;
    readonly type: string;
    readonly nominalValue: number;
    readonly issueValue: number;
    readonly currency: string;
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

    readonly interestRate: number;
    readonly accuredInterest: number;
    readonly periodInterest: number;
}

export function parseUTCDate(dateString: string): Date {
    return new Date(dateString.replaceAll('.', '-') + 'T00:00:00.000Z');
}