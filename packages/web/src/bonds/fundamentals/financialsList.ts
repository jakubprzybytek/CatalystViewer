import type { IssuerProfile } from '@/sdk/Issuers';

// Which issuers to list on the Financials page: by where their yearly figures come from.
export type CoverageFilter = 'all' | 'reports' | 'ai-only' | 'none';

export type FinancialsListItem = {
  issuerName: string;
  industry: string;
  latestReportYear?: number;
  reportYears: number;
  formats: string[];
  scopes: ('single' | 'group')[];
  latestAiYear?: number;
  aiYears: number;
  scorecardUses?: 'report' | 'ai';
};

export function toListItem(profile: IssuerProfile): FinancialsListItem {
  const { filed, ai } = profile.financialsCoverage ?? {};
  return {
    issuerName: profile.issuerName,
    industry: profile.industry,
    latestReportYear: filed ? Number(filed.latestPeriodEnd.slice(0, 4)) : undefined,
    reportYears: filed?.years ?? 0,
    formats: filed?.formats ?? [],
    scopes: filed?.scopes ?? [],
    latestAiYear: ai?.latestYear,
    aiYears: ai?.years ?? 0,
    scorecardUses: profile.financialsSource ? (profile.financialsSource.kind === 'filing' ? 'report' : 'ai') : undefined,
  };
}

export function matchesFilter(item: FinancialsListItem, filter: CoverageFilter): boolean {
  switch (filter) {
    case 'reports': return item.reportYears > 0;
    case 'ai-only': return item.reportYears === 0 && item.aiYears > 0;
    case 'none': return item.reportYears === 0 && item.aiYears === 0;
    default: return true;
  }
}

// Issuers with imported reports first (newest year first), then AI-only, then nothing; by name within.
export function buildFinancialsList(profiles: IssuerProfile[], filter: CoverageFilter, search: string): FinancialsListItem[] {
  const query = search.trim().toLocaleLowerCase('pl');
  const rank = (i: FinancialsListItem) => (i.reportYears > 0 ? 0 : i.aiYears > 0 ? 1 : 2);
  return profiles
    .map(toListItem)
    .filter(item => matchesFilter(item, filter))
    .filter(item => !query || item.issuerName.toLocaleLowerCase('pl').includes(query) || item.industry?.toLocaleLowerCase('pl').includes(query))
    .sort((a, b) => rank(a) - rank(b)
      || (b.latestReportYear ?? 0) - (a.latestReportYear ?? 0)
      || a.issuerName.localeCompare(b.issuerName, 'pl'));
}

export function countByFilter(profiles: IssuerProfile[]): Record<CoverageFilter, number> {
  const items = profiles.map(toListItem);
  const count = (filter: CoverageFilter) => items.filter(i => matchesFilter(i, filter)).length;
  return { all: items.length, reports: count('reports'), 'ai-only': count('ai-only'), none: count('none') };
}
