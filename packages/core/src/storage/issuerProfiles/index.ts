export * from './IssuerProfilesTable';

import type { FundamentalScorecard } from '../../bonds/fundamentals/scorecard';

export type DbIssuerProfileRecord = {
    issuerName: string;        // PK
    recordType: '#PROFILE';    // SK (literal)
    industry: string;
    businessSummary: string;
    websiteUrl?: string;
    classifiedAt: string;      // ISO 8601 (debugging)
    classifiedAtTs: number;    // Unix ms (business logic)
    modelId: string;
};

export type DbIssuerAnalysisRecord = {
    issuerName: string;        // PK
    recordType: string;        // SK: "#ANALYSIS#<iso>" | "#LATEST_ANALYSIS"
    performedAt: string;       // ISO 8601 (debugging)
    performedAtTs: number;     // Unix ms (business logic)
    modelId: string;
    scorecard?: FundamentalScorecard;
    agentFinancials?: unknown;
    agentLog?: unknown[];
};
