import { removeElement } from '@/common/Arrays';
import BondReportsFilterDrawer from './BondReportsFilterDrawer';
import { filterBy, isInterestBaseType, isIssuedBy, isOnMarkets, nominalValueLessThan, isCurrency, isTreasuryBondType } from "@/bonds/statistics";
import { FINANCE, isInIndustries, type IssuerIndustry } from "@/bonds/fundamentals/industries";

export default BondReportsFilterDrawer;

export * from './BondReportsFilterPanel';

export type BondReportsFilteringOptions = {
  bondType: string;
  maxNominal: number;
  currencies: string[];
  markets: string[];
  interestBaseTypes: string[];
  issuers: string[];
  treasuryBondTypes: string[];
  industries: string[];       // issuers' industries (corporate bonds); none = all
  financeGroups: string[];    // narrows Finance: debt collectors, leasing & factoring, …; none = all of Finance
}

export const CORPORATE_BONDS = 'Corporate bonds';

export const POLISH_TREASURY_ISSUER = 'Skarb Państwa';

// `industryOf` gives a bond issuer's industry (from the issuer profiles); without it the industry filter is off.
// It applies to corporate bonds only: other bond types have one industry each.
export function filterUsing(filteringOptions: BondReportsFilteringOptions, industryOf?: (issuerName: string) => IssuerIndustry) {
  const byIndustry = industryOf && filteringOptions.bondType === CORPORATE_BONDS
    ? [isInIndustries(filteringOptions.industries ?? [], filteringOptions.financeGroups ?? [], industryOf)] : [];
  return filterBy([
    ...byIndustry,
    // isBondType(filteringOptions.bondType),
    nominalValueLessThan(filteringOptions.maxNominal),
    isCurrency(filteringOptions.currencies),
    isOnMarkets(filteringOptions.markets),
    isInterestBaseType(filteringOptions.interestBaseTypes),
    isIssuedBy(filteringOptions.issuers),
    ...(filteringOptions.issuers.includes(POLISH_TREASURY_ISSUER) ? [isTreasuryBondType(filteringOptions.treasuryBondTypes)] : [])
  ])
};

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

export function currenciesModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return {
    addCurrency: (newCurrency: string) => setFilteringOptions({ ...filteringOptions, currencies: [...filteringOptions.currencies, newCurrency] }),
    removeCurrency: (currencyToRemove: string) => setFilteringOptions({ ...filteringOptions, currencies: removeElement(filteringOptions.currencies, currencyToRemove) })
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

export function treasuryBondTypesModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  return {
    addtreasuryBondType: (newtreasuryBondType: string) => setFilteringOptions({ ...filteringOptions, treasuryBondTypes: [...filteringOptions.treasuryBondTypes, newtreasuryBondType] }),
    removetreasuryBondType: (treasuryBondTypeToRemove: string) => setFilteringOptions({ ...filteringOptions, treasuryBondTypes: removeElement(filteringOptions.treasuryBondTypes, treasuryBondTypeToRemove) }),
  }
}

export function industriesModifiers(filteringOptions: BondReportsFilteringOptions, setFilteringOptions: (newFilteringOptions: BondReportsFilteringOptions) => void) {
  const industries = filteringOptions.industries ?? [];
  const financeGroups = filteringOptions.financeGroups ?? [];
  const toggleIndustry = (industry: string) => industries.includes(industry)
    // Finance's groups go with it
    ? setFilteringOptions({ ...filteringOptions, industries: removeElement(industries, industry), ...(industry === FINANCE ? { financeGroups: [] } : {}) })
    : setFilteringOptions({ ...filteringOptions, industries: [...industries, industry] });
  return {
    toggleIndustry,
    toggleFinanceGroup: (group: string) => setFilteringOptions({
      ...filteringOptions,
      financeGroups: financeGroups.includes(group) ? removeElement(financeGroups, group) : [...financeGroups, group],
    }),
    clearIndustries: () => setFilteringOptions({ ...filteringOptions, industries: [], financeGroups: [] }),
  };
}
