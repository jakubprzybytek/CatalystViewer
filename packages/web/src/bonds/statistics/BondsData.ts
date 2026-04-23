import { BondReport } from '@/sdk/Bonds';

// Properties extractors
export const interestBaseType = (b: BondReport) => b.details.interestVariable ?? 'Const';
export const interestConstPart = (b: BondReport) => b.details.interestConst;
export const firstDay = (b: BondReport) => b.details.firstDayTs;

// Predicates
export const isBondType = (type: string) => type !== 'all' ? (b: BondReport) => b.details.type === type : () => true;
export const isIssuedBy = (issuers: string[]) => issuers.length > 0 ? (b: BondReport) => issuers.includes(b.details.issuer) : () => true;
export const isInterestBaseType = (interestBaseTypes: string[]) => interestBaseTypes.length > 0 ? (b: BondReport) => interestBaseTypes.includes(b.details.interestVariable ?? 'Const') : () => true;
export const nominalValueLessThan = (maxNominalValue: number) => (b: BondReport) => b.details.nominalValue <= maxNominalValue;
export const isOnMarkets = (markets: string[]) => (b: BondReport) => markets.includes(b.details.market);
export const isCurrency = (currencies: string[]) => (b: BondReport) => currencies.includes(b.details.currency);
export const isTreasuryBondType = (treasuryBondTypes: string[]) =>
    treasuryBondTypes.length > 0
        ? (b: BondReport) => treasuryBondTypes.some(t => new RegExp(`^${t}`).test(b.details.name))
        : () => true;

// Getters
export const getInterestConstParts = (bonds: BondReport[]) => bonds.map(interestConstPart);
export const getNominalValues = (bonds: BondReport[]) => bonds.map(b => b.details.nominalValue);
export const getIssueValues = (bonds: BondReport[]) => bonds.map(b => b.details.issueValue);

// Getters with unique values
export const getUniqueInterestBaseTypes = (bonds: BondReport[]): string[] => [...new Set(bonds.map(interestBaseType))];
export const getUniqueIssuers = (bonds: BondReport[]): string[] => [...new Set(bonds.map(b => b.details.issuer))];
export const getUniqueMarkets = (bonds: BondReport[]): string[] => [...new Set(bonds.map(b => b.details.market))];
export const getUniqueCurrencies = (bonds: BondReport[]): string[] => [...new Set(bonds.map(b => b.details.currency))];

// Group by
export const groupByType = (bonds: BondReport[]) => Object.groupBy(bonds, b => b.details.type) as Record<string, BondReport[]>;
export const groupByIssuer = (bonds: BondReport[]) => Object.groupBy(bonds, b => b.details.issuer) as Record<string, BondReport[]>;
export const groupByInterestBaseType = (bonds: BondReport[]) => Object.groupBy(bonds, interestBaseType) as Record<string, BondReport[]>;

// Filters
type BondReportPredicate = (bondReport: BondReport) => boolean;
export const filterBy = (predicates: BondReportPredicate[]) => (bonds: BondReport[]) => bonds.filter(b => predicates.every(p => p(b)));

// Sorting
export const sortStrings = (arr: string[]) => [...arr].sort();

export const sortByName = (bonds: BondReport[]) => [...bonds].sort((a, b) => a.details.name.localeCompare(b.details.name));
export const sortByTimeToMaturityAsc = (bonds: BondReport[]) => [...bonds].sort((a, b) => a.currentValues.yearsToMaturity - b.currentValues.yearsToMaturity);
export const sortByInterestProgress = (bonds: BondReport[]) => [...bonds].sort((a, b) => a.currentValues.interestProgress - b.currentValues.interestProgress);
