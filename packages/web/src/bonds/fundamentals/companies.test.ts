import { describe, expect, it } from 'vitest';
import type { IssuerProfile } from '../../sdk/Issuers';
import { cardNames, namesOfCard } from './companies';

const identity = (cardName: string, otherNames: string[]) => ({ entityId: '0000028860', legalName: 'ORLEN SPÓŁKA AKCYJNA', country: 'PL', status: 'confirmed' as const, otherNames, cardName });
const profiles: IssuerProfile[] = [
  { issuerName: 'Orlen S.A.', industry: 'Energy', businessSummary: '', identity: identity('Orlen S.A.', ['PKN Orlen S.A.']) },
  { issuerName: 'PKN Orlen S.A.', industry: 'Energy', businessSummary: '', identity: identity('Orlen S.A.', ['Orlen S.A.']) },
  { issuerName: 'Testowa S.A.', industry: 'Retail', businessSummary: '' },
];

describe('company cards', () => {
  it('shows the names of one company under its card name', () => {
    const card = cardNames(profiles);
    expect(['Orlen S.A.', 'PKN Orlen S.A.', 'Testowa S.A.', 'Unknown S.A.'].map(card)).toEqual(['Orlen S.A.', 'Orlen S.A.', 'Testowa S.A.', 'Unknown S.A.']);
  });

  it("lists a card's bond names, for the issuer filter", () => {
    expect(namesOfCard('Orlen S.A.', profiles)).toEqual(['Orlen S.A.', 'PKN Orlen S.A.']);
    expect(namesOfCard('Testowa S.A.', profiles)).toEqual(['Testowa S.A.']);
  });
});
