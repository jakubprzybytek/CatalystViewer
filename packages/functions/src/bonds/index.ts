import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { DbBondDetails } from '@catalyst-viewer/core/storage';

export type { BondDetails, BondCurrentValues };

export type BondReport = {
    details: BondDetails;
    currentValues: BondCurrentValues;

    detailsUpdatedTs: number;

    referencePrice?: number;
    lastPrice?: number;
    lastDateTime?: string;
    bidCount?: number;
    bidVolume?: number;
    bidPrice?: number;
    askPrice?: number;
    askVolume?: number;
    askCount?: number;
};

export type BondReportsQueryResult = {
    bondReports: BondReport[];
    facets: {
        type: string[];
    };
}

export type UpdateBondsResult = {
    bondsUpdated: number,
    newBonds: DbBondDetails[],
    bondsDeactivated: DbBondDetails[],
    bondsFailed: string[]
}
