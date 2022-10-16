import { BondDetails } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type { BondDetails };

export type BondReport = {
    details: BondDetails;
    detailsUpdated: string;
    currentInterestPeriodFirstDay: string;
    nextInterestRightsDay: string;
    nextInterestPayoffDay: string;
    accumulatedInterest: number;
    accuredInterest: number;
    nextInterest: number;
    closingPrice: number;
    closingPriceNetYtm: YieldToMaturityReport;
    closingPriceGrossYtm: YieldToMaturityReport;
    bidPrice?: number;
    bidPriceNetYtm?: YieldToMaturityReport;
    bidPriceGrossYtm?: YieldToMaturityReport;
    askPrice?: number;
    askPriceNetYtm?: YieldToMaturityReport;
    askPriceGrossYtm?: YieldToMaturityReport;
};
