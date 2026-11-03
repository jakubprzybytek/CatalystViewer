import { describe, expect, it } from 'vitest';
import { entityIdOf, gleifClient, identityName, identityRecord, namesAgree, resolveIdentity, resolveIssuer, searchText, type Gleif, type LeiEntity } from './identity';

// Answers as GLEIF gave them (trimmed)
const ORLEN: LeiEntity = { lei: '259400X5T1L2MBS7DS05', legalName: 'ORLEN SPÓŁKA AKCYJNA', otherNames: [], jurisdiction: 'PL', registeredAt: 'RA000484', registeredAs: '0000028860', category: 'GENERAL', status: 'ISSUED' };
const LODZ: LeiEntity = { lei: '259400BJLHUHZDUVNI71', legalName: 'ŁÓDŹ-MIASTO NA PRAWACH POWIATU', otherNames: [], jurisdiction: 'PL', registeredAt: 'RA000654', registeredAs: '471020563', category: 'RESIDENT_GOVERNMENT_ENTITY', status: 'ISSUED' };
const PEU: LeiEntity = { lei: '213800G4WKC4TX8X3R23', legalName: 'PEU (FIN) PLC', otherNames: [], jurisdiction: 'GB', registeredAt: 'RA000585', registeredAs: '11180493', category: 'GENERAL', status: 'ISSUED' };
const DINO: LeiEntity = { lei: '259400H4L81SMPRTW956', legalName: '"DINO POLSKA" SPÓŁKA AKCYJNA', otherNames: [], jurisdiction: 'PL', registeredAt: 'RA000484', registeredAs: '0000408273', status: 'ISSUED' };
const FUND: LeiEntity = { lei: '213800K1Z2UMQB8G8J20', legalName: 'AXA WORLD FUNDS – EMERGING MARKETS SHORT DURATION BONDS EX CCC', otherNames: [], jurisdiction: 'LU', status: 'LAPSED' };

const fakeGleif = (byIsin: Record<string, LeiEntity>, search: Record<string, LeiEntity[]> = {}): Gleif & { calls: string[] } => {
    const calls: string[] = [];
    return {
        calls,
        byIsin: async isin => { calls.push(`isin ${isin}`); return byIsin[isin]; },
        search: async text => { calls.push(`search ${text}`); return search[text] ?? []; },
        byLei: async () => undefined,
        byKrs: async () => undefined,
        directParent: async () => undefined,
    };
};

describe('names', () => {
    it.each([
        ['Orlen S.A.', 'ORLEN SPÓŁKA AKCYJNA', true],
        ['Miasto Łódź', 'ŁÓDŹ-MIASTO NA PRAWACH POWIATU', true],
        ['Miasto Świętochłowice', 'GMINA ŚWIĘTOCHŁOWICE', true],
        ['Dino Polska S.A.', '"DINO POLSKA" SPÓŁKA AKCYJNA', true],
        ['Orlen Capital AB (publ)', 'Orlen Capital AB (publ)', true],
        ['Pepco Group NV', 'PEU (FIN) PLC', false],
        ['AB S.A.', 'AB SPÓŁKA AKCYJNA', true],
        ['Santander Bank Polska S.A.', 'ERSTE BANK POLSKA SPÓŁKA AKCYJNA', false],
    ])('%s ~ %s: %s', (issuer, legal, agree) => {
        expect(namesAgree(issuer, { ...ORLEN, legalName: legal })).toBe(agree);
    });

    it('agrees with a former name the register keeps', () => {
        expect(namesAgree('PKN Orlen S.A.', { ...ORLEN, otherNames: ['PKN ORLEN SPÓŁKA AKCYJNA'] })).toBe(true);
    });

    it('searches without the legal form or a former name', () => {
        expect(searchText('Tauron Polska Energia S.A.')).toBe('Tauron Polska Energia');
        expect(searchText('Grenevia S.A. (d. Famur)')).toBe('Grenevia');
        expect(searchText('HB Reavis Holding S.à r.l.')).toBe('HB Reavis Holding');
        expect(identityName('Polski Bank Spółdzielczy w Poznaniu (d. w Ciechanowie)')).toBe('POLSKI BANK SPOLDZIELCZY W POZNANIU');
    });
});

describe('resolveIssuer', () => {
    it('takes the LEI of the first bond the register maps, confirmed when the names agree', async () => {
        const gleif = fakeGleif({ PLORLEN00041: ORLEN });
        const r = await resolveIssuer('Orlen S.A.', ['XS0000000001', 'PLORLEN00041', 'PLORLEN00058'], gleif);
        expect(r).toMatchObject({ found: true, source: 'isin', evidence: 'ISIN PLORLEN00041', status: 'confirmed', entity: { lei: ORLEN.lei } });
        expect(gleif.calls).toEqual(['isin XS0000000001', 'isin PLORLEN00041']);
    });

    it('keeps a match under another name for review (a financing vehicle, a rename)', async () => {
        const r = await resolveIssuer('Pepco Group NV', ['XS2000000001'], fakeGleif({ XS2000000001: PEU }));
        expect(r).toMatchObject({ found: true, status: 'review', note: 'the LEI register names it "PEU (FIN) PLC"' });
    });

    it('falls back to the name, accepting exactly one record with the same name', async () => {
        const r = await resolveIssuer('Dino Polska S.A.', ['PLDINPL00011'], fakeGleif({}, { 'Dino Polska': [DINO] }));
        expect(r).toMatchObject({ found: true, source: 'name', status: 'confirmed', entity: { lei: DINO.lei } });
    });

    it("doesn't take a search hit with another name", async () => {
        const r = await resolveIssuer('CCC S.A.', [], fakeGleif({}, { CCC: [FUND] }));
        expect(r).toEqual({ found: false, reason: 'no LEI for its ISINs (none known), and no LEI record with this name' });
    });

    it('refuses several records with the same name', async () => {
        const r = await resolveIssuer('Gmina Olkusz', [], fakeGleif({}, { 'Gmina Olkusz': [{ ...LODZ, legalName: 'GMINA OLKUSZ' }, { ...LODZ, lei: 'X', legalName: 'GMINA OLKUSZ', status: 'LAPSED' }] }));
        expect(r).toMatchObject({ found: false });
    });
});

describe('identityRecord', () => {
    it('keys a Polish company by its KRS number, a foreign one by its LEI', () => {
        expect(entityIdOf(ORLEN)).toEqual({ entityId: '0000028860', krs: '0000028860' });
        expect(entityIdOf(PEU)).toEqual({ entityId: `LEI:${PEU.lei}` });
        expect(entityIdOf(LODZ)).toEqual({ entityId: `LEI:${LODZ.lei}` });    // a municipality isn't in the KRS
    });

    it('records where it came from, and whose reports to use', () => {
        const record = identityRecord('Pepco Group NV', PEU, { source: 'isin', evidence: 'ISIN XS2000000001', status: 'review', note: 'n', parentLei: '213800OVMJPFP79OB449', financialsEntityId: 'LEI:213800OVMJPFP79OB449' }, new Date('2026-11-03T10:00:00Z'));
        expect(record).toEqual({
            issuerName: 'Pepco Group NV', recordType: '#IDENTITY', entityId: `LEI:${PEU.lei}`, lei: PEU.lei, legalName: 'PEU (FIN) PLC', country: 'GB',
            register: { authority: 'RA000585', id: '11180493' }, category: 'GENERAL', leiStatus: 'ISSUED', parentLei: '213800OVMJPFP79OB449',
            financialsEntityId: 'LEI:213800OVMJPFP79OB449', status: 'review', source: 'isin', evidence: 'ISIN XS2000000001', note: 'n', resolvedAt: '2026-11-03T10:00:00.000Z',
        });
    });
});

describe('gleifClient', () => {
    it('asks the API by ISIN, name, LEI and KRS number', async () => {
        const urls: string[] = [];
        const record = { id: ORLEN.lei, attributes: { entity: { legalName: { name: ORLEN.legalName }, jurisdiction: 'PL', registeredAt: { id: 'RA000484' }, registeredAs: '0000028860', category: 'GENERAL' }, registration: { status: 'ISSUED' } } };
        const gleif = gleifClient(async url => { urls.push(url); return url.includes('direct-parent') ? undefined : url.includes('/lei-records/') ? { data: record } : { data: [record] }; }, 0);
        expect((await gleif.byIsin('PLPKN0000257'))?.registeredAs).toBe('0000028860');
        await gleif.search('Orlen');
        expect((await gleif.byLei(ORLEN.lei))?.legalName).toBe('ORLEN SPÓŁKA AKCYJNA');
        await gleif.byKrs('0000028860');
        expect(await gleif.directParent(ORLEN.lei)).toBeUndefined();
        expect(urls.map(u => decodeURIComponent(u).replace('https://api.gleif.org/api/v1', ''))).toEqual([
            '/lei-records?filter[isin]=PLPKN0000257',
            '/lei-records?filter[fulltext]=Orlen&page[size]=10',
            `/lei-records/${ORLEN.lei}`,
            '/lei-records?filter[entity.registeredAs]=0000028860',
            `/lei-records/${ORLEN.lei}/direct-parent`,
        ]);
    });
});

describe('resolveIdentity', () => {
    const PEPCO: LeiEntity = { lei: '213800OVMJPFP79OB449', legalName: 'PEPCO GROUP N.V.', otherNames: [], jurisdiction: 'NL', registeredAt: 'RA000463', registeredAs: '81928491', status: 'ISSUED' };
    const withParent = (gleif: Gleif, parents: Record<string, LeiEntity>): Gleif => ({
        ...gleif,
        directParent: async lei => (lei === PEU.lei ? PEPCO.lei : undefined),
        byLei: async lei => parents[lei],
    });

    it("uses the parent's figures when the bond name is the parent's (a financing vehicle)", async () => {
        const outcome = await resolveIdentity('Pepco Group NV', ['XS2000000001'], withParent(fakeGleif({ XS2000000001: PEU }), { [PEPCO.lei]: PEPCO }), new Date('2026-11-03T10:00:00Z'));
        expect(outcome).toMatchObject({
            found: true,
            parent: { legalName: 'PEPCO GROUP N.V.', entityId: `LEI:${PEPCO.lei}` },
            record: { entityId: `LEI:${PEU.lei}`, financialsEntityId: `LEI:${PEPCO.lei}`, parentLei: PEPCO.lei, status: 'review', note: 'issued by PEU (FIN) PLC, a vehicle of PEPCO GROUP N.V., whose figures are used' },
        });
    });

    it("doesn't ask for the parent of a confirmed Polish company", async () => {
        const gleif = fakeGleif({ PLORLEN00041: ORLEN });
        const outcome = await resolveIdentity('Orlen S.A.', ['PLORLEN00041'], { ...gleif, directParent: async () => { throw new Error('asked'); } }, new Date());
        expect(outcome).toMatchObject({ found: true, record: { entityId: '0000028860', financialsEntityId: '0000028860' } });
    });
});
