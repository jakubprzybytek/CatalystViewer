import * as R from 'ramda';

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
}

const interestConstAverage = R.prop<'interestConstAverage', number>('interestConstAverage');

export const sortByInterestConstAverage = R.sortBy<IssuerReport>(interestConstAverage);
