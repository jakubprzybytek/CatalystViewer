export * from './IssuerProfilesTable';

export type DbIssuerProfile = {
    issuerName: string;
    industry: string;
    businessSummary: string;
    classifiedAt: string;
    classifiedAtTs: number;
    modelId: string;
}
