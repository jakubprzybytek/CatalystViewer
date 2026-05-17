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
    classificationsCap?: number;
    forceClassification?: boolean;
};

export type CollectIssuersResult = UpdateBondsResult & {
    unclassifiedIssuers: string[];
} & ClassificationConfig;

export type ClassifyIssuersResult = CollectIssuersResult & {
    classifiedIssuers: ClassifiedIssuer[];
    failedIssuers: FailedIssuer[];
};

export type SendReportInput = CollectIssuersResult & Partial<Pick<ClassifyIssuersResult, 'classifiedIssuers' | 'failedIssuers'>>;

// ─── Fundamental Analysis Workflow ───────────────────────────────────────────

export type SelectIssuersInput = {
    issuers?: string[];
    count?: number;
};

export type SelectIssuersResult = {
    selectedIssuers: string[];
};

export type AnalyzeIssuerInput = {
    issuerName: string;
};

export type AnalyzeIssuerResult =
    | { issuerName: string; performedAt: string; success: true }
    | { issuerName: string; success: false; error: string };
