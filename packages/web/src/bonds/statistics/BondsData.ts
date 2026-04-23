import { BondReport, BondDetails, BondCurrentValues } from '@/sdk/Bonds';

// Properties extractors - BondDetails
const name = (b: BondReport) => b.details.name;
const bondType = (b: BondReport) => b.details.type;
const issuer = (b: BondReport) => b.details.issuer;
const market = (b: BondReport) => b.details.market;
export const interestBaseType = (b: BondReport) => b.details.interestVariable ?? 'Const';
export const interestConstPart = (b: BondReport) => b.details.interestConst;
export const firstDay = (b: BondReport) => b.details.firstDayTs;
const nominalValue = (b: BondReport) => b.details.nominalValue;
const currency = (b: BondReport) => b.details.currency;
const issueValue = (b: BondReport) => b.details.issueValue;

// Properties extractors - CurrentValues
const timeToMaturity = (b: BondReport) => b.currentValues.yearsToMaturity;
const interestProgress = (b: BondReport) => b.currentValues.interestProgress;

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
export const getNominalValues = (bonds: BondReport[]) => bonds.map(nominalValue);
export const getIssueValues = (bonds: BondReport[]) => bonds.map(issueValue);

// Getters with unique values
export const getUniqueInterestBaseTypes = (bonds: BondReport[]): string[] => [...new Set(bonds.map(interestBaseType))];
export const getUniqueIssuers = (bonds: BondReport[]): string[] => [...new Set(bonds.map(issuer))];
export const getUniqueMarkets = (bonds: BondReport[]): string[] => [...new Set(bonds.map(market))];
export const getUniqueCurrencies = (bonds: BondReport[]): string[] => [...new Set(bonds.map(currency))];

// Group by
export const groupByType = (bonds: BondReport[]) => Object.groupBy(bonds, bondType) as Record<string, BondReport[]>;
export const groupByIssuer = (bonds: BondReport[]) => Object.groupBy(bonds, issuer) as Record<string, BondReport[]>;
export const groupByInterestBaseType = (bonds: BondReport[]) => Object.groupBy(bonds, interestBaseType) as Record<string, BondReport[]>;

// Filters
type BondReportPredicate = (bondReport: BondReport) => boolean;
export const filterBy = (predicates: BondReportPredicate[]) => (bonds: BondReport[]) => bonds.filter(b => predicates.every(p => p(b)));

// Sorting
export const sortStrings = (arr: string[]) => [...arr].sort();

export const sortByName = (bonds: BondReport[]) => [...bonds].sort((a, b) => name(a).localeCompare(name(b)));
export const sortByTimeToMaturityAsc = (bonds: BondReport[]) => [...bonds].sort((a, b) => timeToMaturity(a) - timeToMaturity(b));
export const sortByInterestProgress = (bonds: BondReport[]) => [...bonds].sort((a, b) => interestProgress(a) - interestProgress(b));
