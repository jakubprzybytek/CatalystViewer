export * from './IssuerFinancialsTable';

import type { FilingField, FilingScope, ParsedFiling, SourcedFigure } from '../../bonds/fundamentals/filings/FilingParser';

// One fiscal year of an issuer's financials, read from a filed statement.
// Key: entityId (PK), period = "<periodEnd>#<scope>" (SK). Each filing gives two years: its own (column
// "current") and the comparative previous year ("previous"), which fills a year until its own filing comes.
export type DbIssuerFinancialsRecord = {
    entityId: string;             // PK: the KRS number (Polish companies), else "LEI:<lei>"
    krs?: string;
    lei?: string;
    period: string;               // SK: "<YYYY-MM-DD>#single" | "<YYYY-MM-DD>#group"
    issuerName: string;           // the app's issuer name (BondDetails, IssuerProfiles)
    companyName: string;          // as in the filing
    scope: FilingScope;
    periodStart: string;
    periodEnd: string;
    months: number;
    currency: string;             // ISO 4217; figures are in units of it
    figures: Partial<Record<FilingField, SourcedFigure>>;
    column: 'current' | 'previous';
    filing: {
        key: string;              // S3 key of the original file in the Filings bucket
        sha256: string;
        format: ParsedFiling['format'];
        schema: string;
        preparedOn?: string;
        checks: string[];         // failed consistency checks of the filing
        notes?: string[];         // how figures were derived where the filing left a choice
    };
    importedAt: string;           // ISO 8601
};
