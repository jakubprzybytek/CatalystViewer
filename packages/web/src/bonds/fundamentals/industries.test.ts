import { describe, expect, it } from 'vitest';
import type { IssuerProfile } from '../../sdk/Issuers';
import type { BondReport } from '../../sdk/Bonds';
import { industryCounts, industryOfIssuer, isInIndustries } from './industries';

const identity = (cardName: string, otherNames: string[]) => ({ entityId: '0000028860', legalName: 'ORLEN SPÓŁKA AKCYJNA', country: 'PL', status: 'confirmed' as const, otherNames, cardName });
const profiles: IssuerProfile[] = [
  { issuerName: 'Orlen S.A.', industry: 'Energy', businessSummary: '', identity: identity('Orlen S.A.', ['PKN Orlen S.A.']) },
  // an old name classified differently still goes with its company's card
  { issuerName: 'PKN Orlen S.A.', industry: 'Manufacturing', businessSummary: '', identity: identity('Orlen S.A.', ['Orlen S.A.']) },
  { issuerName: 'Atal S.A.', industry: 'Developer', businessSummary: '' },
  { issuerName: 'Kruk S.A.', industry: 'Finance', businessSummary: '' },
  { issuerName: 'Vehis Finanse Sp. z o.o.', industry: 'Finance', businessSummary: '' },
  { issuerName: 'mBank S.A.', industry: 'Finance', businessSummary: '' },
];
const bond = (issuer: string, name: string) => ({ details: { issuer, name } }) as unknown as BondReport;
const bonds = [bond('Orlen S.A.', 'ORL1'), bond('PKN Orlen S.A.', 'PKN1'), bond('Atal S.A.', 'ATA1'), bond('Atal S.A.', 'ATA2'),
  bond('Kruk S.A.', 'KRU1'), bond('Vehis Finanse Sp. z o.o.', 'VHS1'), bond('mBank S.A.', 'MBK1'), bond('Nowa S.A.', 'NOW1')];
const industryOf = industryOfIssuer(profiles);
const names = (industries: string[], groups: string[] = []) => bonds.filter(isInIndustries(industries, groups, industryOf)).map(b => b.details.name);

describe('industry filter', () => {
  it("takes the industry of the company's card, Finance with its group, others unclassified", () => {
    expect(industryOf('PKN Orlen S.A.')).toEqual({ industry: 'Energy' });
    expect(industryOf('Kruk S.A.')).toEqual({ industry: 'Finance', financeGroup: 'Debt collector' });
    expect(industryOf('Vehis Finanse Sp. z o.o.')).toEqual({ industry: 'Finance', financeGroup: 'Leasing & factoring' });
    expect(industryOf('mBank S.A.')).toEqual({ industry: 'Finance', financeGroup: 'Banks & other' });
    expect(industryOf('Nowa S.A.')).toEqual({ industry: 'Unclassified' });
  });

  it('keeps every bond with no industry chosen, else the chosen industries; Finance groups narrow Finance only', () => {
    expect(names([])).toHaveLength(bonds.length);
    expect(names(['Energy', 'Developer'])).toEqual(['ORL1', 'PKN1', 'ATA1', 'ATA2']);
    expect(names(['Finance'])).toEqual(['KRU1', 'VHS1', 'MBK1']);
    expect(names(['Finance', 'Developer'], ['Debt collector'])).toEqual(['ATA1', 'ATA2', 'KRU1']);
    expect(names(['Developer'], ['Debt collector'])).toEqual(['ATA1', 'ATA2']);
  });

  it('counts companies, not bonds or names; unclassified last', () => {
    const { industries, financeGroups } = industryCounts(bonds, profiles, industryOf);
    expect(industries).toEqual([{ name: 'Finance', count: 3 }, { name: 'Developer', count: 1 }, { name: 'Energy', count: 1 }, { name: 'Unclassified', count: 1 }]);
    expect(financeGroups).toEqual([{ name: 'Debt collector', count: 1 }, { name: 'Leasing & factoring', count: 1 }, { name: 'Banks & other', count: 1 }]);
  });
});
