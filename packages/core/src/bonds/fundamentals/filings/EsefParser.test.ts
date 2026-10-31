import { describe, expect, it } from 'vitest';
import { UnsupportedFilingError } from './FilingParser';
import { looksLikeEsef, openEsef, parseEsef, parseIxNumber } from './EsefParser';
import { esefPackage, esefReport, makeZip } from './fixtures/esefPackage';

const value = (filing: ReturnType<typeof parseEsef>, column: number, field: string) =>
    (filing.periods[column].figures as Record<string, { value: number; source: string[] }>)[field];

describe('parseIxNumber', () => {
    it.each([
        ['1,234,567', 'ixt:num-dot-decimal', 1234567],
        ['1,250.5', 'ixt:num-dot-decimal', 1250.5],
        ['1 234 567', 'ixt:num-comma-decimal', 1234567],
        ['1.234,5', 'ixt:num-comma-decimal', 1234.5],
        ['-', 'ixt:fixed-zero', 0],
        ['–', 'ixt:num-dot-decimal', 0],
        ['12', 'ixt:numcommadecimal', 12],
    ])('%s (%s) → %d', (raw, format, expected) => {
        expect(parseIxNumber(raw, format)).toBe(expected);
    });
});

describe('parseEsef', () => {
    describe('report package', () => {
        const filing = parseEsef(openEsef(esefPackage, 'testowa.zip'));

        it('reads the entity, scope, currency and the two fiscal years', () => {
            expect(filing).toMatchObject({
                format: 'esef', scope: 'group', companyName: 'Testowa Deweloper S.A.', lei: '259400TESTOWA0000001', currency: 'PLN', checks: [],
            });
            expect(filing.periods.map(p => [p.column, p.periodStart, p.periodEnd, p.months])).toEqual([
                ['current', '2025-01-01', '2025-12-31', 12],
                ['previous', '2024-01-01', '2024-12-31', 12],
            ]);
        });

        it('applies scale and sign, and ignores facts with dimensions', () => {
            expect(value(filing, 0, 'totalAssets').value).toBe(100_000_000);
            expect(value(filing, 0, 'equity').value).toBe(40_000_000);       // not the 99,999 of the parent-only column
            expect(value(filing, 1, 'netProfit').value).toBe(-1_250_500);
            expect(value(filing, 1, 'operatingCashFlow').value).toBe(-500_000);
            expect(value(filing, 0, 'intangibleAssets')).toEqual({ value: 1_000_000, source: ['ifrs-full:IntangibleAssetsOtherThanGoodwill', 'ifrs-full:Goodwill'] });
            expect(value(filing, 0, 'capex').value).toBe(350_000);
        });

        it('sums the debt lines of the calculation tree, with filer lines classified by anchor and label', () => {
            expect(value(filing, 0, 'financialDebt')).toEqual({
                value: 29_500_000,
                source: ['ifrs-full:LongtermBorrowings', 'ifrs-full:NoncurrentPortionOfNoncurrentBondsIssued', 'ifrs-full:NoncurrentLeaseLiabilities', 'testowa:BondsAndLoansCurrent', 'ifrs-full:CurrentLeaseLiabilities'],
            });
            // "credits, loans and bonds" can't be split, so bonds are the bond-only lines
            expect(value(filing, 0, 'bonds')).toEqual({ value: 8_000_000, source: ['ifrs-full:NoncurrentPortionOfNoncurrentBondsIssued'] });
        });

        it('sums revenue lines when no total is tagged, including filer lines anchored to revenue', () => {
            expect(value(filing, 0, 'revenue')).toEqual({ value: 50_000_000, source: ['ifrs-full:RevenueFromSaleOfGoods', 'testowa:RentalRevenue'] });
            expect(filing.notes).toEqual(expect.arrayContaining(['Revenue: no total tagged, sum of revenue lines', 'Interest: no interest expense tagged, finance costs used']));
        });
    });

    describe('report without its package', () => {
        const filing = parseEsef(openEsef(esefReport, 'testowa.xhtml'));

        it('falls back to the standard IFRS concepts, and says so', () => {
            expect(value(filing, 0, 'financialDebt').value).toBe(24_500_000);
            expect(value(filing, 0, 'revenue').value).toBe(45_000_000);
            expect(filing.notes).toContain('Debt: report without its package, standard IFRS debt concepts only (filer-specific lines are missed)');
        });
    });

    it('falls back per side when the calculation tree covers only one', () => {
        const report = esefReport.toString('utf-8');
        const partial = makeZip({
            'p/reports/r.xhtml': report,
            'p/x/r_cal.xml': `<link:linkbase xmlns:link="http://www.xbrl.org/2003/linkbase" xmlns:xlink="http://www.w3.org/1999/xlink"><link:calculationLink>
<link:loc xlink:label="p" xlink:href="x.xsd#ifrs-full_NoncurrentLiabilities"/><link:loc xlink:label="c" xlink:href="x.xsd#ifrs-full_LongtermBorrowings"/>
<link:calculationArc xlink:from="p" xlink:to="c" weight="1"/></link:calculationLink></link:linkbase>`,
        });
        const filing = parseEsef(openEsef(partial));
        expect(value(filing, 0, 'financialDebt').source).toEqual(['ifrs-full:LongtermBorrowings', 'ifrs-full:CurrentLeaseLiabilities']);
        expect(filing.notes).toContain('Debt: no current borrowing lines in the calculation tree, standard IFRS concepts used');
    });

    it('flags a balance sheet that does not add up', () => {
        const broken = Buffer.from(esefReport.toString('utf-8').replace(
            '<ix:nonFraction name="ifrs-full:EquityAndLiabilities" contextRef="I2025" unitRef="PLN" decimals="-3" scale="3" format="ixt:num-dot-decimal">100,000',
            '<ix:nonFraction name="ifrs-full:EquityAndLiabilities" contextRef="I2025" unitRef="PLN" decimals="-3" scale="3" format="ixt:num-dot-decimal">100,900'));
        expect(parseEsef(openEsef(broken)).checks).toEqual([
            '2025-12-31: total assets 100,000,000 ≠ total equity and liabilities 100,900,000',
            '2025-12-31: equity 40,000,000 + liabilities 60,000,000 ≠ 100,900,000',
        ]);
    });

    it('tells ESEF from other files, and refuses an untagged report', () => {
        expect(looksLikeEsef(esefPackage)).toBe(true);
        expect(looksLikeEsef(esefReport)).toBe(true);
        expect(looksLikeEsef(Buffer.from('<?xml version="1.0"?><JednostkaInna/>'))).toBe(false);
        const untagged = Buffer.from('<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"><body>Bilans</body></html>');
        expect(() => parseEsef(openEsef(untagged))).toThrow(UnsupportedFilingError);
        expect(() => openEsef(makeZip({ 'a/readme.txt': 'x' }))).toThrow(/not an ESEF report package/);
    });
});
