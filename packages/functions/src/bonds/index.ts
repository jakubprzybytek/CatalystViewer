import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { DbBondDetails } from '@catalyst-viewer/core/storage/bondDetails';
import { DbBondStatistics } from '@catalyst-viewer/core/storage/bondStatistics';

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

export type UpdatedBond = {
    name: string;
    issuer: string;
    type: string;
    interestVariable?: string;
    interestConst: number;
    nominalValue: number;
    currency: string;
}

export type UpdateBondsResult = {
    bondsUpdated: number,
    newBonds: UpdatedBond[],
    bondsDeactivated: UpdatedBond[],
    bondsFailed: string[]
}

export type BondStatisticsQueryResult = DbBondStatistics[];
