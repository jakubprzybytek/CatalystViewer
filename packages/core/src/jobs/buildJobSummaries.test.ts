import { describe, expect, it } from 'vitest';
import {
  buildAnalysisInputSummary,
  buildAnalysisOutputSummary,
  buildBondsInputSummary,
  buildBondsOutputSummary,
  buildErrorSummary,
} from './buildJobSummaries';

describe('buildJobSummaries', () => {
  it('builds bonds input summary with defaults', () => {
    expect(buildBondsInputSummary({})).toEqual({
      updateBonds: true,
      classificationsCap: 10,
      forceClassification: false,
    });
  });

  it('builds bonds output summary with classification counts', () => {
    const result = buildBondsOutputSummary({
      bondsUpdated: 5,
      newBonds: [{ name: 'A' }],
      bondsDeactivated: [{ name: 'B' }, { name: 'C' }],
      bondsFailed: ['X'],
      classificationResults: [{ success: true }, { success: false }, { success: true }],
    });

    expect(result).toEqual({
      bondsUpdated: 5,
      newBondsCount: 1,
      bondsDeactivatedCount: 2,
      bondsFailedCount: 1,
      classifiedIssuersCount: 2,
      failedClassificationsCount: 1,
    });
  });

  it('builds analysis input and output summaries', () => {
    expect(buildAnalysisInputSummary({ issuers: ['A', 'B'] })).toEqual({
      issuers: ['A', 'B'],
      count: 2,
    });

    expect(buildAnalysisOutputSummary([{ success: true }, { success: false }, { success: true }])).toEqual({
      selectedIssuersCount: 3,
      analyzedIssuersCount: 2,
      failedIssuersCount: 1,
    });
  });

  it('builds error summaries from Error and string', () => {
    expect(buildErrorSummary(new Error('boom'), 'AnalyzeIssuers')).toEqual({
      stage: 'AnalyzeIssuers',
      errorType: 'Error',
      message: 'boom',
    });

    expect(buildErrorSummary('bad input', 'SelectIssuers')).toEqual({
      stage: 'SelectIssuers',
      message: 'bad input',
    });
  });
});
