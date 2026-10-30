// The scorecard is built for operating companies. Banks, leasing, debt collectors, insurers
// and municipalities need a different framework (design doc: 2026-05-11-fundamental-analysis-design.md),
// so they get no analysis and no scorecard.
export const OUT_OF_SCOPE_INDUSTRIES: readonly string[] = ['Finance', 'Municipal'];

// Unclassified issuers (no industry yet) stay in scope.
export function isInFundamentalScope(industry: string | undefined): boolean {
    return industry === undefined || !OUT_OF_SCOPE_INDUSTRIES.includes(industry);
}
