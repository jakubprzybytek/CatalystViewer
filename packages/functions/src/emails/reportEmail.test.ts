import { readFileSync } from 'fs';
import path from 'path';
import { compile } from 'pug';
import { describe, expect, it } from 'vitest';
import { htmlToText } from './htmlToText';
import { reportSubject } from './reportSubject';

describe('reportSubject', () => {
    it('is plain on prod and names the stage elsewhere', () => {
        expect(reportSubject('prod')).toBe('Catalyst Update Report');
        expect(reportSubject('int')).toBe('Catalyst Update Report (int)');
    });
});

describe('htmlToText', () => {
    it('drops head and style, keeps text, decodes entities', () => {
        const html = '<html><head><title>T</title><style>body { color: red; }</style></head>'
            + '<body><h2>New &amp; old</h2><div><span>Bond:</span> <span>ABC0129</span></div></body></html>';

        expect(htmlToText(html)).toBe('New & old\nBond: ABC0129');
    });

    it('shows a link once when its text is the URL, otherwise appends the URL', () => {
        expect(htmlToText('<a href="https://a.pl">https://a.pl</a>')).toBe('https://a.pl');
        expect(htmlToText('<a href="https://a.pl">Site</a>')).toBe('Site (https://a.pl)');
    });

    it('renders the report email as readable text', () => {
        const template = compile(readFileSync(path.join(__dirname, 'reportNotification.pug'), 'utf8'), { pretty: true });
        const bond = {
            name: 'RDE0429', issuer: 'Rutkowski Group Sp. z o.o.', type: 'Corporate bonds',
            interestVariable: 'WIBOR 3M', interestConst: 5, nominalValue: '1000,00 zl', issueValue: '30M zl',
        };
        const html = template({
            subject: 'Catalyst Update Report',
            dateTime: new Date('2026-10-25T08:53:00Z'),
            newBonds: [bond],
            bondsDeactivated: [],
            classifiedIssuers: [{ issuerName: 'Rutkowski Group Sp. z o.o.', industry: 'Developer', businessSummary: 'Developer.', websiteUrl: 'https://r.pl' }],
            failedIssuers: [],
        });

        expect(htmlToText(html)).toBe([
            'Date: 25.10.2026, 09:53:00',
            '',
            'New Bonds (1)',
            'Bond: RDE0429',
            'Issuer: Rutkowski Group Sp. z o.o.',
            'Type: Corporate bonds',
            'Interest: WIBOR 3M + 5%',
            'Nominal: 1000,00 zl',
            'Issue value: 30M zl',
            '',
            'Classified Issuers (1)',
            'Issuer: Rutkowski Group Sp. z o.o.',
            'Industry: Developer',
            'Summary:',
            'Developer.',
            'Website: https://r.pl',
        ].join('\n'));
    });
});
