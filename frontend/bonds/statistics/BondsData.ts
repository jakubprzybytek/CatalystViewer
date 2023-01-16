import * as R from 'ramda';
import { BondReport, BondDetails } from '../../sdk/GetBonds';

// Properties extractors
const bondType = R.compose<BondReport[], BondDetails, string>(R.prop('type'), R.prop('details'));
const bondIssuer = R.compose<BondReport[], BondDetails, string>(R.prop('issuer'), R.prop('details'));
const market = R.compose<BondReport[], BondDetails, string>(R.prop('market'), R.prop('details'));
export const interestBaseType = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
export const interestConstPart = R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details'));
const nominalValue = R.compose<BondReport[], BondDetails, number>(R.prop('nominalValue'), R.prop('details'));

// Predicates
const isBondType = (type: string) => type !== 'all' ? (bondReport: BondReport) => bondReport.details.type === type : R.always(true);

// Getters
export const getBondTypes = R.map(bondType);
export const getMarkets = R.map(market);
export const getInterestConstParts = R.map(interestConstPart);
export const getNominalValues = R.map(nominalValue);

// Getters with unique values
export const getUniqueBondTypes = (bondReports: BondReport[]): string[] => R.uniq(getBondTypes(bondReports));
export const getUniqueMarkets = (bondReports: BondReport[]): string[] => R.uniq(getMarkets(bondReports));

// Group by
export const groupByType = R.groupBy(bondType);
export const groupByIssuer = R.groupBy(bondIssuer);
export const groupByInterestBaseType = R.groupBy(interestBaseType);

// Filters
export const filterByBondType = (bondType: string) => R.filter(isBondType(bondType));

// Sorting
export const sortStrings = R.sortBy<string>(R.identity);