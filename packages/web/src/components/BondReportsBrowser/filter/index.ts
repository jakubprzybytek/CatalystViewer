import BondReportsFilterDrawer from './BondReportsFilterDrawer';
import { filterBy, isBondType, isInterestBaseType, isIssuedBy, isOnMarkets, nominalValueLessThan } from "@/bonds/statistics";

export default BondReportsFilterDrawer;

export * from './BondReportsFilterPanel';

export type BondReportsFilteringOptions = {
  bondType: string;
  maxNominal: number;
  markets: string[];
  interestBaseTypes: string[];
  issuers: string[];
}

export function filterUsing(filteringOptions: BondReportsFilteringOptions) {
  return filterBy([
    // isBondType(filteringOptions.bondType),
    nominalValueLessThan(filteringOptions.maxNominal),
    isOnMarkets(filteringOptions.markets),
    isInterestBaseType(filteringOptions.interestBaseTypes),
    isIssuedBy(filteringOptions.issuers)
  ])
};

const removeElement = (array: string[], elementToRemove: string) => {
  const index = array.indexOf(elementToRemove, 0);
  const newArray = [...array];
  if (index > -1) {
    newArray.splice(index, 1);
  }
  return newArray;
}

export function bondTypeModifier(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return (newBondType: string) => setFilteringOptions({ ...filteringOptions, bondType: newBondType });
}

export function maxNominalValueModifier(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return (newMaxNominalValue: number) => setFilteringOptions({ ...filteringOptions, maxNominal: newMaxNominalValue });
}

export function marketsModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return {
    addMarket: (newMarket: string) => setFilteringOptions({ ...filteringOptions, markets: [...filteringOptions.markets, newMarket] }),
    removeMarket: (marketToRemove: string) => setFilteringOptions({ ...filteringOptions, markets: removeElement(filteringOptions.markets, marketToRemove) })
  }
}

export function interestBaseTypesModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return {
    addInterestBaseTyp: (newInterestBaseType: string) => setFilteringOptions({ ...filteringOptions, interestBaseTypes: [...filteringOptions.interestBaseTypes, newInterestBaseType] }),
    removeInterestBasetType: (interestBaseTypeToRemove: string) => setFilteringOptions({ ...filteringOptions, interestBaseTypes: removeElement(filteringOptions.interestBaseTypes, interestBaseTypeToRemove) })
  }
}

export function issuersModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return {
    addIssuer: (newIssuer: string) => setFilteringOptions({ ...filteringOptions, issuers: [...filteringOptions.issuers, newIssuer] }),
    removeIssuer: (issuerToRemove: string) => setFilteringOptions({ ...filteringOptions, issuers: removeElement(filteringOptions.issuers, issuerToRemove) }),
    removeAllIssuers: () => setFilteringOptions({ ...filteringOptions, issuers: [] })
  }
}
