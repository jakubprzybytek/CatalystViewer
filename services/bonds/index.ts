export type BondDetails = {
    readonly name: string;
    readonly isin: string;
    readonly issuer: string;
    readonly market: string;
    readonly type: string;
    readonly nominalValue: number;
    readonly maturityDay: Date;
    readonly interestType: string;
    readonly interestVariable: string | undefined;
    readonly interestConst: number;
    readonly currentInterestRate: number;
    readonly accuredInterest: number;
}