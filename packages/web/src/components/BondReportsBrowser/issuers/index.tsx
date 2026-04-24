export type IssuerReport = {
    name: string;
    interestBaseType: string;
    interestConstAverage: number;
    currency: string;
    count: number;
    minNominalValue: number;
    maxNominalValue: number;
    avgIssueValue: number;
    totalIssueValue: number;
    industry?: string;
}

export const sortByInterestConstAverage = (reports: IssuerReport[]) => [...reports].sort((a, b) => a.interestConstAverage - b.interestConstAverage);
