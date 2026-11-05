import type { BondReport } from '../../sdk/Bonds';
import type { IssuerProfile } from '../../sdk/Issuers';
import { cardNames } from './companies';
import { financeRuleSetFor, type FinanceRuleSet } from './scorecard';

export const UNCLASSIFIED = 'Unclassified';
export const FINANCE = 'Finance';

// Finance split into the lenders the finance rules score, and the rest (banks, insurers, state bodies)
export const FINANCE_GROUPS = ['Debt collector', 'Leasing & factoring', 'Investment firm', 'Banks & other'] as const;
export type FinanceGroup = typeof FINANCE_GROUPS[number];
const GROUP_OF: Record<FinanceRuleSet, FinanceGroup> = { collector: 'Debt collector', leasing: 'Leasing & factoring', investment: 'Investment firm' };

export type IssuerIndustry = { industry: string; financeGroup?: FinanceGroup };

// The industry of a bond's issuer: its company card's, so all names of a company are in one industry.
export function industryOfIssuer(profiles: IssuerProfile[]): (issuerName: string) => IssuerIndustry {
  const cardOf = cardNames(profiles);
  const byName = new Map(profiles.map(p => [p.issuerName, p]));
  const cache = new Map<string, IssuerIndustry>();
  return issuerName => {
    const cached = cache.get(issuerName);
    if (cached) return cached;
    const card = cardOf(issuerName);
    const industry = byName.get(card)?.industry ?? byName.get(issuerName)?.industry ?? UNCLASSIFIED;
    const ruleSet = financeRuleSetFor(card) ?? financeRuleSetFor(issuerName);
    const result: IssuerIndustry = industry === FINANCE ? { industry, financeGroup: ruleSet ? GROUP_OF[ruleSet] : 'Banks & other' } : { industry };
    cache.set(issuerName, result);
    return result;
  };
}

// Bonds whose issuer is in one of the industries (all when none is chosen). Finance groups narrow
// Finance only, and only when some are chosen.
export function isInIndustries(industries: string[], financeGroups: string[], industryOf: (issuerName: string) => IssuerIndustry) {
  if (industries.length === 0) return () => true;
  return (b: BondReport) => {
    const { industry, financeGroup } = industryOf(b.details.issuer);
    if (!industries.includes(industry)) return false;
    return industry !== FINANCE || financeGroups.length === 0 || financeGroups.includes(financeGroup!);
  };
}

// Companies (cards) per industry and per Finance group among the bonds, most first.
export function industryCounts(bonds: BondReport[], profiles: IssuerProfile[], industryOf: (issuerName: string) => IssuerIndustry) {
  const cardOf = cardNames(profiles);
  const industries = new Map<string, Set<string>>();
  const groups = new Map<string, Set<string>>();
  for (const b of bonds) {
    const card = cardOf(b.details.issuer);
    const { industry, financeGroup } = industryOf(b.details.issuer);
    if (!industries.has(industry)) industries.set(industry, new Set());
    industries.get(industry)!.add(card);
    if (financeGroup) {
      if (!groups.has(financeGroup)) groups.set(financeGroup, new Set());
      groups.get(financeGroup)!.add(card);
    }
  }
  const byCount = (m: Map<string, Set<string>>) => [...m].map(([name, cards]) => ({ name, count: cards.size }));
  return {
    industries: byCount(industries).sort((a, b) => (a.name === UNCLASSIFIED ? 1 : 0) - (b.name === UNCLASSIFIED ? 1 : 0) || b.count - a.count || a.name.localeCompare(b.name)),
    financeGroups: FINANCE_GROUPS.map(name => ({ name, count: groups.get(name)?.size ?? 0 })).filter(g => g.count > 0),
  };
}

// One empty list for filter options missing from older saved settings (stable across renders)
export const NONE: string[] = [];
