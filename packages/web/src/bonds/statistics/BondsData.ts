import * as R from 'ramda';
import { BondReport, BondDetails, BondCurrentValues } from '../../sdk/GetBonds';

// Properties extractors - BondDetails
const name = R.compose<BondReport[], BondDetails, string>(R.prop('name'), R.prop('details'));
const bondType = R.compose<BondReport[], BondDetails, string>(R.prop('type'), R.prop('details'));
const issuer = R.compose<BondReport[], BondDetails, string>(R.prop('issuer'), R.prop('details'));
const market = R.compose<BondReport[], BondDetails, string>(R.prop('market'), R.prop('details'));
export const interestBaseType = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
export const interestConstPart = R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details'));
const nominalValue = R.compose<BondReport[], BondDetails, number>(R.prop('nominalValue'), R.prop('details'));
const issueValue = R.compose<BondReport[], BondDetails, number>(R.prop('issueValue'), R.prop('details'));

// Properties extractors - CurrentValues
const timeToMaturity = R.compose<BondReport[], BondCurrentValues, number>(R.prop('yearsToMaturity'), R.prop('currentValues'));
const interestProgress = R.compose<BondReport[], BondCurrentValues, number>(R.prop('interestProgress'), R.prop('currentValues'));

// Predicates
export const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);
export const isIssuedBy = (issuers: string[]) => issuers.length > 0 ? (bondReport: BondReport) => issuers.includes(bondReport.details.issuer) : R.always(true);
export const isInterestBaseType = (interestbaseTypes: string[]) => interestbaseTypes.length > 0 ? (bondReport: BondReport) => interestbaseTypes.includes(bondReport.details.interestVariable || 'Const') : R.always(true);
export const nominalValueLessThan = (maxNominalValue: number) => (bondReport: BondReport) => bondReport.details.nominalValue <= maxNominalValue;
export const isOnMarkets = (markets: string[]) => (bondReport: BondReport) => markets.includes(bondReport.details.market);

// Getters
export const getBondTypes = R.map(bondType);
export const getIssuers = R.map(issuer);
export const getMarkets = R.map(market);
export const getInterestBaseTypes = R.map(interestBaseType);
export const getInterestConstParts = R.map(interestConstPart);
export const getNominalValues = R.map(nominalValue);
export const getIssueValues = R.map(issueValue);

// Getters with unique values
export const getUniqueBondTypes = (bondReports: BondReport[]): string[] => R.uniq(getBondTypes(bondReports));
export const getUniqueInterestBaseTypes = (bondReports: BondReport[]): string[] => R.uniq(getInterestBaseTypes(bondReports));
export const getUniqueIssuers = (bondReports: BondReport[]): string[] => R.uniq(getIssuers(bondReports));
export const getUniqueMarkets = (bondReports: BondReport[]): string[] => R.uniq(getMarkets(bondReports));

// Group by
export const groupByType = R.groupBy(bondType);
export const groupByIssuer = R.groupBy(issuer);
export const groupByInterestBaseType = R.groupBy(interestBaseType);

// Filters
type BondReportPredicate = (bondReport: BondReport) => boolean;
export const filterByBondType = (bondType: string) => R.filter(isBondType(bondType));
export const filterByIssuer = (issuers: string[]) => R.filter(isIssuedBy(issuers));
export const filterBy = (predicates: BondReportPredicate[]) => R.filter(R.allPass(predicates));

// Sorting
export const sortStrings = R.sortBy<string>(R.identity);

export const sortByName = R.sortBy<BondReport>(name);
export const sortByTimeToMaturityAsc = R.sortBy<BondReport>(timeToMaturity);
export const sortByInterestProgress = R.sortBy<BondReport>(interestProgress);
