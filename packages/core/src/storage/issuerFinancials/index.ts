export * from './IssuerFinancialsTable';

import type { FilingExtraction, FilingField, FilingScope, ParsedFiling, SourcedFigure } from '../../bonds/fundamentals/filings/FilingParser';
import type { StatementLine } from '../../bonds/fundamentals/filings/statementLines';

// parsed: as imported; hand-checked: in the test set (scripts/check-filings); flagged: someone noted a problem
export type ReviewStatus = 'parsed' | 'hand-checked' | 'flagged';

// One fiscal year of an issuer's financials, read from a filed statement.
// Key: entityId (PK), period = "<periodEnd>#<scope>" (SK). Each filing gives two years: its own (column
// "current") and the comparative previous year ("previous"), which fills a year until its own filing comes.
export type DbIssuerFinancialsRecord = {
    entityId: string;             // PK: the KRS number (Polish companies), else "LEI:<lei>"
    krs?: string;
    lei?: string;
    registration?: { country: string; id?: string };  // ISO 3166 country and local register number (KRS for Poland)
    period: string;               // SK: "<YYYY-MM-DD>#single" | "<YYYY-MM-DD>#group"
    issuerName: string;           // the app's issuer name (BondDetails, IssuerProfiles)
    companyName: string;          // as in the filing
    scope: FilingScope;
    periodStart: string;
    periodEnd: string;
    months: number;
    currency: string;             // ISO 4217; figures are in units of it
    standard?: ParsedFiling['standard'];          // rows imported before statement lines have none
    presentedUnit?: ParsedFiling['presentedUnit'];
    lineSigns?: ParsedFiling['lineSigns'];
    figures: Partial<Record<FilingField, SourcedFigure>>;
    lines?: StatementLine[];      // every line of the primary statements; left out by the list reads
    review?: { status: ReviewStatus; note?: string; at?: string };
    linesExtraction?: FilingExtraction;  // PDF lines added later (reparse-filings): the model read they came from
    column: 'current' | 'previous';
    filing: {
        key: string;              // S3 key of the original file in the Filings bucket
        sha256: string;
        format: ParsedFiling['format'];
        schema: string;
        preparedOn?: string;
        checks: string[];         // failed consistency checks of the filing
        notes?: string[];         // how figures were derived where the filing left a choice
        extraction?: FilingExtraction;  // ai-pdf: model, prompt version, pages read
    };
    importedAt: string;           // ISO 8601
};
