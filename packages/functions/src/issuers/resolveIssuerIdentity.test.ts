import { describe, expect, it } from 'vitest';
import type { DbIssuerIdentityRecord } from '@core/storage/issuerProfiles';
import type { Gleif, LeiEntity } from '@core/bonds/issuers/identity';
import { resolveIssuerIdentity } from './resolveIssuerIdentity';

const RUTKOWSKI: LeiEntity = { lei: '259400XGF4BWC5Z2H659', legalName: 'RUTKOWSKI GROUP SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', otherNames: [], jurisdiction: 'PL', registeredAt: 'RA000484', registeredAs: '0001044425', status: 'ISSUED' };
const gleif = (byIsin: Record<string, LeiEntity>): Gleif => ({
    byIsin: async isin => byIsin[isin], search: async () => [], byLei: async () => undefined, byKrs: async () => undefined, directParent: async () => undefined,
});
const profiles = (existing?: DbIssuerIdentityRecord) => {
    const stored: DbIssuerIdentityRecord[] = [];
    return { stored, getIdentity: async () => existing, storeIdentity: async (r: DbIssuerIdentityRecord) => { stored.push(r); } };
};

describe('resolveIssuerIdentity', () => {
    it("stores a new issuer's company found by its bonds' ISINs", async () => {
        const p = profiles();
        const summary = await resolveIssuerIdentity('Rutkowski Group Sp. z o.o.', { profiles: p, isins: async () => ['PLO436700028'], gleif: gleif({ PLO436700028: RUTKOWSKI }), now: new Date('2026-11-03T00:00:00Z') });
        expect(summary).toEqual({ found: true, existing: false, legalName: RUTKOWSKI.legalName, entityId: '0001044425', status: 'confirmed' });
        expect(p.stored).toMatchObject([{ issuerName: 'Rutkowski Group Sp. z o.o.', recordType: '#IDENTITY', entityId: '0001044425', source: 'isin' }]);
    });

    it('leaves an existing identity (set or confirmed by hand) as it is', async () => {
        const existing = { issuerName: 'PKN Orlen S.A.', recordType: '#IDENTITY', entityId: '0000028860', legalName: 'ORLEN SPÓŁKA AKCYJNA', country: 'PL', financialsEntityId: '0000028860', status: 'confirmed', source: 'manual', evidence: 'set by hand', resolvedAt: '' } as DbIssuerIdentityRecord;
        const p = profiles(existing);
        const summary = await resolveIssuerIdentity('PKN Orlen S.A.', { profiles: p, isins: async () => { throw new Error('not needed'); }, gleif: gleif({}) });
        expect(summary).toEqual({ found: true, existing: true, legalName: 'ORLEN SPÓŁKA AKCYJNA', entityId: '0000028860', status: 'confirmed' });
        expect(p.stored).toEqual([]);
    });

    it("reports a name the register doesn't have, storing nothing", async () => {
        const p = profiles();
        const summary = await resolveIssuerIdentity('WB Electronics S.A.', { profiles: p, isins: async () => [], gleif: gleif({}) });
        expect(summary).toMatchObject({ found: false });
        expect(p.stored).toEqual([]);
    });
});
