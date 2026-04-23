import { BondReport } from '@/sdk/Bonds';
import { InterestPercentilesByInterestBaseType, groupByInterestBaseType, interestConstPart, firstDay, interestBaseType } from '.';
import { getInterestConstColorCode } from '@/bonds/BondIndicators';
import { colorMarkers } from '@/common/ColorCodes';

export type Bond2dPoint = {
    x: number;
    y: number;
    color: string;
    name: string;
    interestVariable: string;
};

export type Bonds2dStatsByInterestBaseType = Record<string, Bond2dPoint[]>;

export function get2dStatsForInterestBaseTypes(
    filteredBondReports: BondReport[],
    statistics: InterestPercentilesByInterestBaseType
): Bonds2dStatsByInterestBaseType {
    const bondsByBaseType = groupByInterestBaseType(filteredBondReports);

    const result: Bonds2dStatsByInterestBaseType = {};
    Object.keys(bondsByBaseType).forEach(baseType => {
        const bonds = bondsByBaseType[baseType] as BondReport[];
        const percentiles = statistics[baseType];
        result[baseType] = bonds.map(bond => {
            const y = interestConstPart(bond);
            const colorCode = percentiles ? getInterestConstColorCode(y, percentiles) : 'none';
            return {
                x: firstDay(bond),
                y,
                color: colorMarkers[colorCode]?.backgroundColor ?? '#888',
                name: bond.details.name,
                interestVariable: bond.details.interestVariable ?? 'Const'
            };
        });
    });
    return result;
}
