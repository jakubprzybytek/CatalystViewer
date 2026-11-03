import type { IssuerProfile } from '../../sdk/Issuers';

// Names of one company share a card: each bond issuer name maps to its company's card name.
export function cardNames(profiles: IssuerProfile[]): (issuerName: string) => string {
  const byName = new Map(profiles.map(p => [p.issuerName, p.identity?.cardName]));
  return issuerName => byName.get(issuerName) ?? issuerName;
}

// All bond issuer names shown on a card: the card's name and the company's other names.
export function namesOfCard(cardName: string, profiles: IssuerProfile[]): string[] {
  const profile = profiles.find(p => p.issuerName === cardName);
  return [cardName, ...(profile?.identity?.otherNames ?? [])];
}
