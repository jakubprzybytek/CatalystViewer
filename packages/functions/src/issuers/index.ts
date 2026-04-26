import { UpdateBondsResult } from '../bonds';

export type { UpdateBondsResult };

export type ClassifiedIssuer = {
    issuerName: string;
    industry: string;
    businessSummary: string;
    websiteUrl?: string;
    modelId: string;
};

export type FailedIssuer = {
    issuerName: string;
    errorReason: string;
};

export type ClassificationConfig = {
    classyficationsCap?: number;
    forceClassification?: boolean;
};

export type CollectIssuersResult = UpdateBondsResult & {
    unclassifiedIssuers: string[];
} & ClassificationConfig;

export type ClassifyIssuersResult = CollectIssuersResult & {
    classifiedIssuers: ClassifiedIssuer[];
    failedIssuers: FailedIssuer[];
};
