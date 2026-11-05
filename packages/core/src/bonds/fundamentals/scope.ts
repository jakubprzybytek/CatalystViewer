// The AI analysis and the general rule sets are built for operating companies, so Finance and Municipal
// issuers get no AI analysis. Non-bank lenders listed in FINANCE_RULE_SETS (scorecard.ts) are still scored
// from their reports, by the finance rules (2026-11-05-finance-rules-design.md); banks, insurers, state
// bodies and municipalities get no scorecard.
export const OUT_OF_SCOPE_INDUSTRIES: readonly string[] = ['Finance', 'Municipal'];

// Unclassified issuers (no industry yet) stay in scope.
export function isInFundamentalScope(industry: string | undefined): boolean {
    return industry === undefined || !OUT_OF_SCOPE_INDUSTRIES.includes(industry);
}
