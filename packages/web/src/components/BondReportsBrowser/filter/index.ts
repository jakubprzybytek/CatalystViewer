import BondReportsFilterPanel from './BondReportsFilterPanel';
import { filterBy, isBondType, isInterestBaseType, isOnMarkets, nominalValueLessThan } from "@/bonds/statistics";

export default BondReportsFilterPanel;

export type BondReportsFilteringOptions = {
  bondType: string;
  maxNominal: number;
  markets: string[];
  interestBaseTypes: string[];
}

export function filterUsing(filteringOptions: BondReportsFilteringOptions) {
  return filterBy([
    // isBondType(filteringOptions.bondType),
    nominalValueLessThan(filteringOptions.maxNominal),
    isOnMarkets(filteringOptions.markets),
    isInterestBaseType(filteringOptions.interestBaseTypes)
  ])
};
