import { BondDetails } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type BondReport = {
    details: BondDetails;
    detailsUpdated: string;
    closingPrice: number;
    closingPriceNetYtm: YieldToMaturityReport;
    closingPriceGrossYtm: YieldToMaturityReport;
    previousInterestPayoffDay: string;
    nextInterestPayoffDay: string;
};
