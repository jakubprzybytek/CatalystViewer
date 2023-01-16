import * as R from 'ramda';

export type IssuerReport = {
    name: string;
    interestBaseType: string;
    interestConstAverage: number;
    minNominalValue: number;
    maxNominalValue: number;
    count: number;
}

const interestConstAverage = R.prop<'interestConstAverage', number>('interestConstAverage');

export const sortByInterestConstAverage = R.sortBy<IssuerReport>(interestConstAverage);
