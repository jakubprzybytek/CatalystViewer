import { quantile, min } from 'simple-statistics';
import { BondsStatistics, InterestPercentilesByInterestBaseType, groupByType, groupByInterestBaseType, getInterestConstParts } from '.';
import { BondReport } from '../../sdk/GetBonds';

export function computeStatisticsForInterestBaseTypes(bonds: BondReport[]): InterestPercentilesByInterestBaseType {
    const bondsByInterestBaseType = groupByInterestBaseType(bonds);

    const interestVariableTypePercentiles: InterestPercentilesByInterestBaseType = {};
    Object.keys(bondsByInterestBaseType)
        .forEach(interestBaseType => {
            const interestConstValues = getInterestConstParts(bondsByInterestBaseType[interestBaseType] as BondReport[]);
            const quartiles = quantile(interestConstValues, [0.25, 0.5, 0.75, 1]);
            interestVariableTypePercentiles[interestBaseType] = [min(interestConstValues), ...quartiles];
        });
    return interestVariableTypePercentiles;
}

// export function computeStatistics(allBonds: BondReport[]): BondsStatistics {
//     const bondsByType = groupByType(allBonds);
//     const bondTypesStatistics: Record<string, InterestPercentilesByInterestBaseType> = {};
//     Object.keys(bondsByType)
//         .forEach(bondType => {
//             bondTypesStatistics[bondType] = computeStatisticsForInterestBaseTypes(bondsByType[bondType]);
//         });

//     return {
//         all: computeStatisticsForInterestBaseTypes(allBonds),
//         byType: bondTypesStatistics
//     }
// }
