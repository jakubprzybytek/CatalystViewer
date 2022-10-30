import * as R from 'ramda';
import { quantile, min } from 'simple-statistics';
import { BondsStatistics, InterestByBaseTypePercentiles } from '.';
import { BondReport, BondDetails } from '../../sdk/GetBonds';

const bondType = R.compose<BondReport[], BondDetails, string>(R.prop('type'), R.prop('details'));
export const interestVariablePart = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
const interestConstPart = R.map(R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details')));

const groupByType = R.groupBy(bondType);
const groupByInterestVariableType = R.groupBy(interestVariablePart);

function computeInterestConstValuesStatistics(bonds: BondReport[]): InterestByBaseTypePercentiles {
    const bondsByInterestBaseType = groupByInterestVariableType(bonds);

    const interestVariableTypePercentiles: InterestByBaseTypePercentiles = {};
    Object.keys(bondsByInterestBaseType)
        .forEach(interestBaseType => {
            const interestConstValues = interestConstPart(bondsByInterestBaseType[interestBaseType]);
            const quartiles = quantile(interestConstValues, [0.25, 0.5, 0.75, 1]);
            interestVariableTypePercentiles[interestBaseType] = [min(interestConstValues), ...quartiles];
        });
    return interestVariableTypePercentiles;
}

export function computeStatistics(allBonds: BondReport[]): BondsStatistics {
    const bondsByType = groupByType(allBonds);
    const bondTypesStatistics: Record<string, InterestByBaseTypePercentiles> = {};
    Object.keys(bondsByType)
        .forEach(bondType => {
            bondTypesStatistics[bondType] = computeInterestConstValuesStatistics(bondsByType[bondType]);
        });

    return {
        all: computeInterestConstValuesStatistics(allBonds),
        byType: bondTypesStatistics
    }
}
