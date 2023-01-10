import * as R from 'ramda';
import { BondReport, BondDetails } from '../../sdk/GetBonds';

const bondIssuer = R.compose<BondReport[], BondDetails, string>(R.prop('issuer'), R.prop('details'));
const interestVariablePart = R.compose<BondReport[], BondDetails, string | undefined, string>(R.defaultTo('Const'), R.prop('interestVariable'), R.prop('details'));
const interestConstPart = R.compose<BondReport[], BondDetails, number>(R.prop('interestConst'), R.prop('details'));
const nominalValue = R.compose<BondReport[], BondDetails, number>(R.prop('nominalValue'), R.prop('details'));

export const getInterestConstParts = R.map(interestConstPart);
export const getNominalValues = R.map(nominalValue);

export const groupByIssuer = R.groupBy(bondIssuer);
export const groupByInterestVariablePart = R.groupBy(interestVariablePart);
