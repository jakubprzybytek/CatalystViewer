import { BondDetails, BondCurrentValues } from '../../bonds';
import { YieldToMaturityReport } from '../../bonds/formulas/YieldToMaturity';

export type { BondDetails, BondCurrentValues };

export type BondReport = {
    details: BondDetails;
    currentValues: BondCurrentValues;

    detailsUpdated: string;
    detailsUpdatedTs: number;

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
