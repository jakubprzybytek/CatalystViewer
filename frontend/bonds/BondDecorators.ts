import { ColorCode } from "../common/ColorCodes";

export const nominalValueColorCode = (nominalValue: number): ColorCode => nominalValue >= 50000 ? 'red' : nominalValue >= 10000 ? 'orange' : 'green';
