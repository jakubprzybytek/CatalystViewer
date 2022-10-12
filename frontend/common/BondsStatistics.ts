import * as R from 'ramda';
import { quantile, min } from 'simple-statistics';
import { BondReport, BondDetails } from '../sdk/GetBonds';

const bondType = R.compose<BondReport[], BondDetails, string>(R.prop('type'), R.prop('details'));
export const interestVariablePart = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
const interestConstPart = R.map(R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details')));

const groupByType = R.groupBy(bondType);
const groupByInterestVariableType = R.groupBy(interestVariablePart);

export type InterestVariableTypePercentiles = Record<string, number[]>;
export type BondsStatistics = Record<string, InterestVariableTypePercentiles>;

export function computeStatistics(bonds: BondReport[]): BondsStatistics {
    const bondsByType = groupByType(bonds);

    const bondTypesStatistics: BondsStatistics = {};
    Object.keys(bondsByType)
        .forEach((bondType) => {
            const bondsByInterestVariableType = groupByInterestVariableType(bondsByType[bondType]);

            const interestVariableTypePercentiles: InterestVariableTypePercentiles = {};
            Object.keys(bondsByInterestVariableType)
                .forEach((interestVariableType) => {
                    const interestConstValues = interestConstPart(bondsByInterestVariableType[interestVariableType]);
                    const quartiles = quantile(interestConstValues, [0.25, 0.5, 0.75, 1]);
                    interestVariableTypePercentiles[interestVariableType] = [min(interestConstValues), ...quartiles];
                });
            bondTypesStatistics[bondType] = interestVariableTypePercentiles;
        });

    return bondTypesStatistics;
}
