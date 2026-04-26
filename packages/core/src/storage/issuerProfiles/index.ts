export * from './IssuerProfilesTable';

export type DbIssuerProfile = {
    issuerName: string;
    industry: string;
    businessSummary: string;
    websiteUrl?: string;
    classifiedAt: string;
    classifiedAtTs: number;
    modelId: string;
}
