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

// Who an issuer name is: the company behind the bonds listed under that name, from the LEI register
// (GLEIF) or set by hand (scripts/resolve-issuers). Names whose rows share an entityId are one company.
export type DbIssuerIdentityRecord = {
    issuerName: string;            // PK: the name on the bonds
    recordType: '#IDENTITY';       // SK (literal)
    entityId: string;              // KRS number of a Polish company, else "LEI:<lei>" (as in IssuerFinancials)
    lei?: string;
    krs?: string;
    legalName: string;             // from the LEI register
    country: string;               // ISO 3166 alpha-2
    register?: { authority: string; id: string };   // GLEIF registration authority and local number (RA000484 = KRS)
    category?: string;             // GLEIF entity category: GENERAL, FUND, RESIDENT_GOVERNMENT_ENTITY, …
    leiStatus?: string;            // ISSUED, LAPSED, RETIRED, …
    parentLei?: string;            // direct parent in the LEI register, when reported
    financialsEntityId: string;    // whose reports the scorecard uses: entityId, or the group's for a financing vehicle
    status: 'confirmed' | 'review';
    source: 'isin' | 'name' | 'manual';
    evidence: string;              // e.g. "ISIN PLPKN0000257", "name match", "set by hand"
    note?: string;                 // why it is under review
    resolvedAt: string;            // ISO 8601
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
    reportMarkdown?: string;   // Full markdown report of the analysis run
};

export type DbIssuerAnalysisSummary = {
    issuerName: string;
    performedAt: string;
    performedAtTs: number;
    scorecard?: FundamentalScorecard;
    agentFinancials?: unknown;
};
