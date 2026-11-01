import { describe, expect, it } from 'vitest';
import type { IssuerProfile } from '@/sdk/Issuers';
import { buildFinancialsList, countByFilter } from './financialsList';

const profile = (issuerName: string, industry: string, coverage: IssuerProfile['financialsCoverage']): IssuerProfile =>
  ({ issuerName, industry, businessSummary: '', financialsCoverage: coverage });

const profiles = [
  profile('Zeta S.A.', 'Retail', { ai: { performedAt: '2026-10-01', latestYear: 2025, years: 4 } }),
  profile('Alfa S.A.', 'Finance', {}),
  profile('Beta S.A.', 'Telecom', { filed: { latestPeriodEnd: '2024-12-31', earliestPeriodEnd: '2023-12-31', years: 2, formats: ['krs-xml'], scopes: ['single'], lastImportedAt: '' } }),
  profile('Gamma S.A.', 'Mining', { filed: { latestPeriodEnd: '2025-12-31', earliestPeriodEnd: '2024-12-31', years: 2, formats: ['ai-pdf'], scopes: ['group'], lastImportedAt: '' } }),
];

describe('buildFinancialsList', () => {
  it('lists issuers with reports first (newest first), then AI-only, then nothing', () => {
    expect(buildFinancialsList(profiles, 'all', '').map(i => i.issuerName)).toEqual(['Gamma S.A.', 'Beta S.A.', 'Zeta S.A.', 'Alfa S.A.']);
  });

  it('filters by coverage and by name or industry', () => {
    expect(buildFinancialsList(profiles, 'ai-only', '').map(i => i.issuerName)).toEqual(['Zeta S.A.']);
    expect(buildFinancialsList(profiles, 'none', '').map(i => i.issuerName)).toEqual(['Alfa S.A.']);
    expect(buildFinancialsList(profiles, 'all', 'mini').map(i => i.issuerName)).toEqual(['Gamma S.A.']);
    expect(buildFinancialsList(profiles, 'all', 'beta').map(i => i.issuerName)).toEqual(['Beta S.A.']);
  });

  it('counts issuers per filter', () => {
    expect(countByFilter(profiles)).toEqual({ all: 4, reports: 2, 'ai-only': 1, none: 1 });
  });
});
