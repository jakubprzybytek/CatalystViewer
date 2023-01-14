import { quantile, min } from 'simple-statistics';
import { BondsStatistics, InterestByBaseTypePercentiles, groupByType, groupByInterestVariablePart, getInterestConstParts } from '.';
import { BondReport } from '../../sdk/GetBonds';

function computeInterestConstValuesStatistics(bonds: BondReport[]): InterestByBaseTypePercentiles {
    const bondsByInterestBaseType = groupByInterestVariablePart(bonds);

    const interestVariableTypePercentiles: InterestByBaseTypePercentiles = {};
    Object.keys(bondsByInterestBaseType)
        .forEach(interestBaseType => {
            const interestConstValues = getInterestConstParts(bondsByInterestBaseType[interestBaseType]);
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
