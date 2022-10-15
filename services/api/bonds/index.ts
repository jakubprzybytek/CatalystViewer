import { BondDetails } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type { BondDetails };

export type BondReport = {
    details: BondDetails;
    detailsUpdated: string;
    closingPrice: number;
    closingPriceNetYtm: YieldToMaturityReport;
    closingPriceGrossYtm: YieldToMaturityReport;
    currentInterestPeriodFirstDay: string;
    accumulatedInterest: number;
    accuredInterest: number;
    nextInterestRightsDay: string;
    nextInterestPayoffDay: string;
    nextInterest: number;
};
