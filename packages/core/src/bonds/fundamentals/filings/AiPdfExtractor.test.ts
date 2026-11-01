import { describe, expect, it } from 'vitest';
import { extractStatements, findKrs, findLei, findStatementPages, isoDate, parsePrinted, transcriptToFiling, type Transcriber } from './AiPdfExtractor';
import { isPdf, readPdfPages } from './pdfText';
import { makePdf } from './fixtures/makePdf';
import { asPages, reportPages, transcript } from './fixtures/pdfReport';

const EXTRACTION = { model: 'test-model', promptVersion: 'test', pages: [2, 3, 4, 5] };
const millions = (filing: ReturnType<typeof transcriptToFiling>, column: number) =>
    Object.fromEntries(Object.entries(filing.periods[column].figures).map(([k, v]) => [k, v!.value / 1e6]));

describe('parsePrinted', () => {
    it.each([['1 000,0', 1000], ['(1 792,2)', -1792.2], ['-', 0], ['', 0], ['–', 0], ['-35,3', -35.3], ['12', 12], ['n/a', undefined], ['2025-12', undefined]])('%s → %s', (printed, value) => {
        expect(parsePrinted(printed)).toBe(value);
    });
});

describe('isoDate', () => {
    it.each([['2025-12-31', '2025-12-31'], ['31.12.2025', '2025-12-31'], ['1.01.2025', '2025-01-01'], ['2025-13-45', undefined], ['grudzień 2025', undefined], [undefined, undefined]])('%s → %s', (printed, iso) => {
        expect(isoDate(printed)).toBe(iso);
    });
});

describe('identifiers in the text', () => {
    const page = (...lines: string[]) => [{ page: 1, lines }];
    it.each([
        ['wpisana do Krajowego Rejestru Sądowego pod numerem 0000123456', '0000123456'],
        ['Krajowego Rejestru Sądowego, numer rejestru KRS 23302, na terenie', '0000023302'],
        ['KRS: 0000217207', '0000217207'],
        ['no number here', undefined],
    ])('KRS in "%s"', (text, krs) => expect(findKrs(page(text))).toBe(krs));
    it('finds a LEI next to its label', () => {
        expect(findLei(page('6920000013 | (NIP) | G30CO71KTT9JDYJESN22 | (LEI)'))).toBe('G30CO71KTT9JDYJESN22');
        expect(findLei(page('LEI: 259400EM1ITR201TTX36'))).toBe('259400EM1ITR201TTX36');
        expect(findLei(page('REGON 390021764'))).toBeUndefined();
    });
});

describe('findStatementPages', () => {
    it('takes each statement page and the next one, not the contents', () => {
        expect(findStatementPages(asPages(reportPages))).toEqual([2, 3, 4, 5]);
    });

    it('finds headings with words in between, over two lines, and the comprehensive income statement', () => {
        const table = Array.from({ length: 14 }, (_, i) => `Pozycja ${i} | 1 000 | 2 000`);
        const pages = [
            { page: 1, lines: ['Wstęp', 'tekst'] },
            { page: 2, lines: ['MARVIPOL \\ RAPORT ROCZNY | 66', 'SKONSOLIDOWANY RACHUNEK ZYSKÓW LUB STRAT', ...table] },
            { page: 3, lines: ['MARVIPOL \\ RAPORT ROCZNY | 68', 'SKONSOLIDOWANE ROCZNE SPRAWOZDANIE', 'Z SYTUACJI FINANSOWEJ (TYS. PLN)', ...table] },
            { page: 4, lines: ['MARVIPOL \\ RAPORT ROCZNY | 71', 'SKONSOLIDOWANE ROCZNE SPRAWOZDANIE', 'Z PRZEPŁYWÓW PIENIĘŻNYCH (TYS. PLN)', ...table] },
        ];
        expect(findStatementPages(pages)).toEqual([2, 3, 4]);
    });

    it('skips a table of contents without dot leaders', () => {
        const table = Array.from({ length: 14 }, (_, i) => `Pozycja ${i} | 1 000 | 2 000`);
        const contents = (page: number, title: string[]) => ({ page, lines: [...title, ...Array.from({ length: 14 }, (_, i) => `NOTA ${i} Opis noty | ${10 + i}`)] });
        const pages = [
            contents(1, ['Spis treści', '1.1 | Skonsolidowany rachunek zysków i strat | 7', '1.2 | Skonsolidowane sprawozdanie z sytuacji finansowej | 8']),
            contents(2, ['NOTA 11 Podatek | 66']),
            { page: 7, lines: ['Skonsolidowany rachunek zysków i strat [tys. PLN]', ...table] },
            { page: 8, lines: ['Skonsolidowane sprawozdanie', 'z sytuacji finansowej [tys. PLN]', ...table] },
        ];
        expect(findStatementPages(pages)).toEqual([7, 8]);
    });
});

describe('transcriptToFiling', () => {
    const pages = asPages(reportPages);

    it('turns the printed lines into figures, with their sources', () => {
        const filing = transcriptToFiling(transcript, pages, EXTRACTION);
        expect(filing).toMatchObject({ format: 'ai-pdf', scope: 'group', companyName: 'Testowa Group', krs: '0000123456', currency: 'PLN', checks: [], extraction: EXTRACTION });
        expect(filing.periods.map(p => [p.column, p.periodStart, p.periodEnd, p.months])).toEqual([['current', '2025-01-01', '2025-12-31', 12], ['previous', '2024-01-01', '2024-12-31', 12]]);
        expect(millions(filing, 0)).toEqual({
            revenue: 1000, ebit: 120, depreciation: 50, interestExpense: 30, netProfit: 70, totalAssets: 2000, equity: 900,
            financialDebt: 650, bonds: 400, cash: 300, currentAssets: 800, inventory: 500, operatingCashFlow: 150, capex: 80,
        });
        expect(millions(filing, 1)).toMatchObject({ operatingCashFlow: -20, financialDebt: 490 });
        expect(filing.periods[0].figures.financialDebt!.source).toEqual(['p. 4/Bank loans', 'p. 4/Bonds', 'p. 4/Lease liabilities']);
    });

    it('rejects an amount that is not on the cited page', () => {
        const wrong = structuredClone(transcript);
        wrong.lines[4].values[0].printed = '75,0';
        expect(transcriptToFiling(wrong, pages, EXTRACTION).checks).toEqual(['p. 2 "Net profit": 75,0 isn\'t on that page']);
    });

    it('flags a balance sheet that does not add up, and missing totals', () => {
        const wrong = structuredClone(transcript);
        wrong.lines[8].values[0].printed = '1 800,0';    // is on the page, in the other column
        wrong.lines = wrong.lines.filter(l => l.field !== 'equity');
        expect(transcriptToFiling(wrong, pages, EXTRACTION).checks).toEqual([
            '2025-12-31: total assets 1,800,000,000 ≠ total equity and liabilities 2,000,000,000',
            '2025-12-31: no total equity',
            '2024-12-31 (comparative): no total equity',
        ]);
    });

    it('says when combined financing lines hide the bonds', () => {
        const mixed = structuredClone(transcript);
        mixed.lines[10].field = 'debtMixed';
        const filing = transcriptToFiling(mixed, pages, EXTRACTION);
        expect(filing.periods[0].figures.bonds).toBeUndefined();
        expect(filing.periods[0].figures.financialDebt!.value).toBe(650_000_000);
        expect(filing.notes).toContain('Debt: the balance sheet has combined financing lines (e.g. "financial liabilities"), so bonds aren\'t split out');
    });
});

describe('extractStatements from a PDF', () => {
    it('reads the PDF text, sends only the statement pages and checks the answer', async () => {
        const pdf = makePdf(reportPages);
        expect(isPdf(pdf)).toBe(true);
        const pages = await readPdfPages(pdf);
        expect(pages[1].lines.slice(1, 4)).toEqual(['Consolidated statement of profit or loss', 'PLN million | 2025 | 2024', 'Revenue | 3 | 1 000,0 | 900,0']);
        expect(findKrs(pages)).toBe('0000123456');

        let prompt = '';
        const transcribe: Transcriber = async p => { prompt = p; return { input: transcript, model: 'test-model', inputTokens: 10, outputTokens: 20 }; };
        const filing = await extractStatements(pages, transcribe);
        expect(prompt).toContain('=== Page 2 ===');
        expect(prompt).not.toContain('=== Page 1 ===');
        expect(filing.checks).toEqual([]);
        expect(filing.extraction).toMatchObject({ model: 'test-model', pages: [2, 3, 4, 5], inputTokens: 10, outputTokens: 20 });
    });
});
