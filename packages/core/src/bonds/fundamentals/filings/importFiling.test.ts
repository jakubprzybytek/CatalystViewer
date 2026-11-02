import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import type { S3Client } from '@aws-sdk/client-s3';
import type { DbIssuerFinancialsRecord, IssuerFinancialsTable } from '../../../storage/issuerFinancials';
import { importFiling, ImportFilingError, normalizeCompanyName, readFiling, type ImportFilingDeps, type LeiRecord } from './importFiling';
import { esefPackage } from './fixtures/esefPackage';
import { makePdf } from './fixtures/makePdf';
import { reportPages, transcript } from './fixtures/pdfReport';

const xml = readFileSync(path.join(__dirname, 'fixtures', 'single-comparative-pln.xml'));
const ifrsText = readFileSync(path.join(__dirname, 'fixtures', 'ifrs-text-single.xhtml'));

// In-memory stand-ins for the table, the bucket and the registers, with the table's write rule.
function fakes(existing: DbIssuerFinancialsRecord[] = [], registered: string | undefined = 'TESTOWA DEWELOPER SPÓŁKA AKCYJNA', lei?: LeiRecord) {
    const rows = new Map(existing.map(r => [`${r.entityId}|${r.period}`, r]));
    const uploads: { key: string; contentType: string }[] = [];
    const deps: ImportFilingDeps = {
        issuerNames: ['Testowa Deweloper S.A.', 'Inna Spółka Sp. z o.o.'],
        financialsTable: {
            getAll: async () => [...rows.values()],
            store: async (record: DbIssuerFinancialsRecord) => {
                const key = `${record.entityId}|${record.period}`;
                if (record.column === 'previous' && rows.get(key)?.column === 'current') return false;
                rows.set(key, record);
                return true;
            },
        } as unknown as IssuerFinancialsTable,
        s3: { send: async (command: { input: { Key: string; ContentType: string } }) => { uploads.push({ key: command.input.Key, contentType: command.input.ContentType }); } } as unknown as S3Client,
        bucket: 'filings',
        registerName: async () => registered,
        leiRecord: async () => lei,
        now: () => new Date('2026-10-30T12:00:00Z'),
    };
    return { deps, rows, uploads };
}

describe('normalizeCompanyName', () => {
    it.each([
        ['Dadelo S.A.', 'DADELO'],
        ['DADELO SPÓŁKA AKCYJNA', 'DADELO'],
        ['Inna Spółka Sp. z o.o.', 'INNA SPOLKA'],
        ['INNA SPÓŁKA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', 'INNA SPOLKA'],
        ['Łódzka Grupa S.K.A.', 'LODZKA GRUPA'],
        ['Nowa Prosta Spółka Akcyjna', 'NOWA'],
        ['Grupa Kapitałowa Cavatina Holding Spółka Akcyjna', 'CAVATINA HOLDING'],
        ['Pepco Group N.V.', 'PEPCO GROUP'],
        ['Pepco Group NV', 'PEPCO GROUP'],
        ['MOL Hungarian Oil & Gas PLC', 'MOL HUNGARIAN OIL GAS'],
    ])('%s → %s', (name, normalized) => {
        expect(normalizeCompanyName(name)).toBe(normalized);
    });
});

describe('readFiling', () => {
    it('tells the formats apart', () => {
        expect(readFiling(xml).filing.format).toBe('krs-xml');
        expect(readFiling(esefPackage).filing.format).toBe('esef');
        expect(readFiling(ifrsText).filing.format).toBe('ifrs-text');
        expect(readFiling(esefPackage).kind.extension).toBe('zip');
    });
});

describe('importFiling', () => {
    it('matches the issuer by name and stores the file and both years', async () => {
        const { deps, rows, uploads } = fakes();
        const result = await importFiling(deps, xml);

        expect(result.issuerName).toBe('Testowa Deweloper S.A.');
        expect(result.entityId).toBe('0000123456');
        expect(result.warnings).toEqual([]);
        expect(uploads.map(u => u.key)).toEqual([result.s3Key]);
        expect(result.s3Key).toMatch(/^filings\/0000123456\/2025-12-31-single-[0-9a-f]{12}\.xml$/);
        expect([...rows.keys()]).toEqual(['0000123456|2025-12-31#single', '0000123456|2024-12-31#single']);
        expect(rows.get('0000123456|2025-12-31#single')).toMatchObject({
            entityId: '0000123456', krs: '0000123456', issuerName: 'Testowa Deweloper S.A.', column: 'current', months: 12, currency: 'PLN',
            importedAt: '2026-10-30T12:00:00.000Z', filing: { format: 'krs-xml' },
        });
    });

    it("doesn't let a comparative column replace a year's own filing", async () => {
        const own = { entityId: '0000123456', period: '2024-12-31#single', column: 'current', issuerName: 'Testowa Deweloper S.A.' } as DbIssuerFinancialsRecord;
        const { deps, rows } = fakes([own]);
        const result = await importFiling(deps, xml);
        expect(result.stored).toEqual([
            { periodEnd: '2025-12-31', column: 'current', written: true },
            { periodEnd: '2024-12-31', column: 'previous', written: false },
        ]);
        expect(rows.get('0000123456|2024-12-31#single')).toBe(own);
    });

    it('writes nothing on a dry run', async () => {
        const { deps, rows, uploads } = fakes();
        const result = await importFiling(deps, xml, { dryRun: true });
        expect(result.stored.every(s => !s.written)).toBe(true);
        expect(rows.size).toBe(0);
        expect(uploads).toEqual([]);
    });

    it('needs --issuer when no issuer has a matching name, and checks it exists', async () => {
        const { deps } = fakes();
        deps.issuerNames = ['Someone Else S.A.'];
        await expect(importFiling(deps, xml)).rejects.toThrow(/pass --issuer/);
        await expect(importFiling(deps, xml, { issuerName: 'Nope S.A.' })).rejects.toThrow(ImportFilingError);
        expect((await importFiling(deps, xml, { issuerName: 'Someone Else S.A.', dryRun: true })).issuerName).toBe('Someone Else S.A.');
    });

    it('refuses an issuer that already has filings of another company', async () => {
        const { deps } = fakes([{ entityId: '0000999999', period: '2024-12-31#single', column: 'current', issuerName: 'Testowa Deweloper S.A.', companyName: 'X' } as DbIssuerFinancialsRecord]);
        await expect(importFiling(deps, xml)).rejects.toThrow(/already has filings of 0000999999/);
    });

    it('refuses a filing that does not add up, unless forced', async () => {
        const { deps } = fakes();
        const broken = Buffer.from(xml.toString('utf-8').replace('<jin:Pasywa><dtsf:KwotaA>1000000', '<jin:Pasywa><dtsf:KwotaA>1000500'));
        await expect(importFiling(deps, broken)).rejects.toThrow(/doesn't add up/);
        const result = await importFiling(deps, broken, { force: true });
        expect(result.warnings).toEqual(['2025-12-31: total assets 1,000,000 ≠ total equity and liabilities 1,000,500']);
    });

    it('warns when the court register has another name for the KRS number', async () => {
        const { deps } = fakes([], 'ZUPEŁNIE INNA SPÓŁKA AKCYJNA');
        const result = await importFiling(deps, xml, { dryRun: true });
        expect(result.warnings).toEqual(['KRS 0000123456 is registered as "ZUPEŁNIE INNA SPÓŁKA AKCYJNA", the filing says "TESTOWA DEWELOPER S.A." (renamed?)']);
    });

    describe('ESEF', () => {
        it('takes the KRS number from the LEI register and stores the package', async () => {
            const { deps, rows, uploads } = fakes([], 'TESTOWA DEWELOPER SPÓŁKA AKCYJNA', { legalName: 'TESTOWA DEWELOPER SPÓŁKA AKCYJNA', krs: '0000123456', registeredAs: '0000123456', jurisdiction: 'PL' });
            const result = await importFiling(deps, esefPackage);
            expect(result).toMatchObject({ issuerName: 'Testowa Deweloper S.A.', entityId: '0000123456', krs: '0000123456', lei: '259400TESTOWA0000001', registration: { country: 'PL', id: '0000123456' }, warnings: [] });
            expect(uploads).toEqual([{ key: expect.stringMatching(/^filings\/0000123456\/2025-12-31-group-[0-9a-f]{12}\.zip$/), contentType: 'application/zip' }]);
            expect(rows.get('0000123456|2025-12-31#group')).toMatchObject({ scope: 'group', lei: '259400TESTOWA0000001', filing: { format: 'esef' } });
        });

        it('stores a company registered outside the KRS under its LEI', async () => {
            const { deps } = fakes([], undefined, { legalName: 'TESTOWA DEWELOPER S.A.', registeredAs: 'B123456', jurisdiction: 'LU' });
            const result = await importFiling(deps, esefPackage, { dryRun: true });
            expect(result.entityId).toBe('LEI:259400TESTOWA0000001');
            expect(result.registration).toEqual({ country: 'LU', id: 'B123456' });
            expect(result.s3Key).toMatch(/^filings\/LEI-259400TESTOWA0000001\//);
            expect(result.warnings).toEqual(["LEI 259400TESTOWA0000001 (TESTOWA DEWELOPER S.A.) isn't registered in the KRS (LU B123456): stored under its LEI"]);
        });

        it('matches the issuer by the registered name when the filing names the group', async () => {
            const { deps } = fakes([], undefined, { legalName: 'INNA SPÓŁKA SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', registeredAs: 'B1', jurisdiction: 'LU' });
            deps.issuerNames = ['Inna Spółka Sp. z o.o.', 'Someone Else S.A.'];
            expect((await importFiling(deps, esefPackage, { dryRun: true })).issuerName).toBe('Inna Spółka Sp. z o.o.');
        });
    });

    describe('PDF', () => {
        const pdf = makePdf(reportPages);

        it('is read by the model, checked, and stored with how it was read', async () => {
            const { deps, rows, uploads } = fakes([], 'TESTOWA GROUP SPÓŁKA AKCYJNA');
            deps.issuerNames = ['Testowa Group S.A.'];
            deps.transcribe = async () => ({ input: transcript, model: 'test-model' });
            const result = await importFiling(deps, pdf);
            expect(result).toMatchObject({ issuerName: 'Testowa Group S.A.', entityId: '0000123456', warnings: [] });
            expect(uploads).toEqual([{ key: expect.stringMatching(/^filings\/0000123456\/2025-12-31-group-[0-9a-f]{12}\.pdf$/), contentType: 'application/pdf' }]);
            expect(rows.get('0000123456|2025-12-31#group')).toMatchObject({
                filing: { format: 'ai-pdf', extraction: { model: 'test-model', promptVersion: 'pdf-statements-4', pages: [2, 3, 4, 5] } },
            });
        });

        it('needs a model', async () => {
            const { deps } = fakes();
            await expect(importFiling(deps, pdf, { dryRun: true })).rejects.toThrow(/no model configured/);
        });

        it("refuses a KRS number from the text that belongs to another company (a subsidiary)", async () => {
            const { deps } = fakes([], 'CARDINA INVESTMENTS SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
            deps.issuerNames = ['Testowa Group S.A.'];
            deps.transcribe = async () => ({ input: transcript, model: 'test-model' });
            await expect(importFiling(deps, pdf, { dryRun: true })).rejects.toThrow(/KRS 0000123456 found in the report is registered as "CARDINA INVESTMENTS.*pass --krs <number>, or --lei/);
        });

        it('takes a KRS number from the text when the registered name is the filing\'s without "Group"', async () => {
            const { deps } = fakes([], 'TESTOWA SPÓŁKA AKCYJNA');
            deps.issuerNames = ['Testowa S.A.'];
            deps.transcribe = async () => ({ input: transcript, model: 'test-model' });
            const result = await importFiling(deps, pdf, { dryRun: true });
            expect(result).toMatchObject({ issuerName: 'Testowa S.A.', entityId: '0000123456' });
        });

        it('stores a foreign issuer under the --lei given, ignoring KRS numbers in the text', async () => {
            const { deps } = fakes([], 'CARDINA INVESTMENTS SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ', { legalName: 'Testowa Group N.V.', registeredAs: '81928491', jurisdiction: 'NL' });
            deps.issuerNames = ['Testowa Group NV'];
            deps.transcribe = async () => ({ input: transcript, model: 'test-model' });
            const result = await importFiling(deps, pdf, { dryRun: true, lei: '724500TESTOWA0000001' });
            expect(result).toMatchObject({ issuerName: 'Testowa Group NV', entityId: 'LEI:724500TESTOWA0000001', lei: '724500TESTOWA0000001' });
            expect(result.krs).toBeUndefined();
            expect(result.filing.krs).toBeUndefined();
        });

        it("doesn't call the model for a PDF that names no company number", async () => {
            const { deps } = fakes();
            let called = false;
            deps.transcribe = async () => { called = true; return { input: transcript, model: 'test-model' }; };
            const anonymous = makePdf(reportPages.map(lines => lines.filter(l => !/KRS/.test(l))));
            await expect(importFiling(deps, anonymous, { dryRun: true })).rejects.toThrow(/pass --krs/);
            expect(called).toBe(false);
        });
    });

    describe('IFRS text', () => {
        it('uses the KRS number found in the document, or --krs', async () => {
            const { deps } = fakes();
            expect((await importFiling(deps, ifrsText, { dryRun: true })).entityId).toBe('0000123456');

            const withoutKrs = Buffer.from(ifrsText.toString('utf-8').replace('pod numerem 0000123456', 'pod numerem (brak)'));
            await expect(importFiling(deps, withoutKrs, { dryRun: true })).rejects.toThrow(/pass --krs/);
            expect((await importFiling(deps, withoutKrs, { dryRun: true, krs: '0000123456' })).entityId).toBe('0000123456');
        });

        it('refuses a --krs that contradicts the filing', async () => {
            const { deps } = fakes();
            await expect(importFiling(deps, ifrsText, { dryRun: true, krs: '0000999999' })).rejects.toThrow(/doesn't match the filing's KRS number/);
        });
    });
});
