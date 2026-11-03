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

export type ClassifyIssuerInput = {
    issuerName: string;
};

export type ResolveIdentityInput = {
    issuerName: string;
};

// The issuer's company in the LEI register, as the ResolveIssuerIdentity step found it
export type IdentitySummary =
    | { found: true; existing: boolean; legalName: string; entityId: string; status: 'confirmed' | 'review'; note?: string }
    | { found: false; reason: string };

export type ClassifiedIssuerResult = ClassifiedIssuer & { success: true; identity?: IdentitySummary };
export type FailedIssuerResult = { issuerName: string; errorReason: string; success: false };
export type ClassifyIssuerResult = ClassifiedIssuerResult | FailedIssuerResult;

export type SendReportInput = CollectIssuersResult & {
    classificationResults?: ClassifyIssuerResult[];
};

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
