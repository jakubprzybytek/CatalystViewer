import { BondDetails } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type BondReport = {
    details: BondDetails;
    closingPrice: number;
    closingPriceYtm: YieldToMaturityReport;
};
