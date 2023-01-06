import { BondDetails } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type { BondDetails };

export type BondReport = {
    details: BondDetails;

    detailsUpdated: string;
    detailsUpdatedTs: number;

    currentInterestFirstDay: number,
    currentInterestRecordDay: number,
    currentInterestPayableDay: number,

    accumulatedInterest: number;
    accuredInterest: number;
    nextInterest: number;
    referencePrice?: number;
    referencePriceNetYtm?: YieldToMaturityReport;
    referencePriceGrossYtm?: YieldToMaturityReport;
    lastPrice?: number;
    lastDateTime?: string;
    lastPriceNetYtm?: YieldToMaturityReport;
    lastPriceGrossYtm?: YieldToMaturityReport;
    bidCount?: number;
    bidVolume?: number;
    bidPrice?: number;
    bidPriceNetYtm?: YieldToMaturityReport;
    bidPriceGrossYtm?: YieldToMaturityReport;
    askPrice?: number;
    askVolume?: number;
    askCount?: number;
    askPriceNetYtm?: YieldToMaturityReport;
    askPriceGrossYtm?: YieldToMaturityReport;
};
