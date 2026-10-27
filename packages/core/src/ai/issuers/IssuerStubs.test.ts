import { describe, expect, it } from 'vitest';
import { INDUSTRY_LABELS } from './IssuerClassification';
import { stubAnalysis, stubClassification, STUB_MODEL_ID } from './IssuerStubs';

describe('AI stubs', () => {
  it('classify every issuer the same way, with a valid industry', () => {
    const classification = stubClassification('Atal S.A.');
    expect(INDUSTRY_LABELS).toContain(classification.industry);
    expect(classification.businessSummary).toContain('Atal S.A.');
  });

  it('analyse with fixed financials through the real scorecard and report', () => {
    const analysis = stubAnalysis('Atal S.A.');
    expect(analysis.modelId).toBe(STUB_MODEL_ID);
    expect(analysis.agentFinancials.years).toHaveLength(2);
    expect(analysis.scorecard.dimensions.length).toBeGreaterThan(0);
    expect(analysis.scorecard.dimensions.some(d => d.signal !== 'na')).toBe(true);
    expect(analysis.reportMarkdown).toContain('# Fundamental Analysis: Atal S.A.');
    expect(stubAnalysis('Atal S.A.').scorecard).toEqual(analysis.scorecard);
  });
});
