import { ColorCode } from "../common/ColorCodes";

export function getNominalValueColorCode(nominalValue: number): ColorCode {
    return nominalValue >= 50000 ? 'red' : nominalValue >= 10000 ? 'orange' : 'green';
}

const interestConstPartColorCodes: ColorCode[] = ['green', 'yellow', 'orange', 'red'];

export function getInterestConstColorCode(interestConst: number, interestConstPecentiles: number[]) {
    const interestConstIndex = interestConstPecentiles
        .findIndex(percentile => interestConst <= percentile) - 1;
    return interestConstPartColorCodes[Math.max(interestConstIndex, 0)];
}
