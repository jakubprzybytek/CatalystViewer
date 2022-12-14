import { describe, it, expect } from "vitest";
import path from 'path';
import { readFileSync } from 'fs';
import { parseBondsQuotesPage } from "./CorporateBondsQuotesPage";

describe("CorporateBondsQuotesPage", () => {
    it("should parse", () => {
        const markup = readFileSync(path.join(__dirname, './testData/notowania-obligacji-obligacje-korporacyjne-20221015.html'), 'utf-8');
        const quotes = parseBondsQuotesPage(markup, 'Obligacje przedsiębiorstw', 'PLN');

        expect(quotes.splice(0, 6)).toEqual([
            {
                name: 'ABE0726',
                market: 'GPW ASO',
                referencePrice: 100,
                currency: 'PLN'
            },
            {
                name: 'ABE1023',
                market: 'BS ASO',
                referencePrice: 100,
                currency: 'PLN'
            },
            {
                name: 'ABE1023',
                market: 'GPW ASO',
                referencePrice: 100,
                currency: 'PLN'
            },
            {
                name: 'ACH0623',
                market: 'GPW ASO',
                referencePrice: 97.34,
                lastDateTime: '2022-10-11',
                lastPrice: 97.34,
                bidCount: 1,
                bidVolume: 3,
                bidPrice: 96.11,
                askPrice: 97,
                askVolume: 4,
                askCount: 1,
                currency: 'PLN'
            },
            {
                name: 'ACH1122',
                market: 'BS ASO',
                referencePrice: 100,
                currency: 'PLN'
            },
            {
                name: 'ACH1122',
                market: 'GPW ASO',
                referencePrice: 99.7,
                lastDateTime: '2022-09-29',
                lastPrice: 99.7,
                bidCount: 1,
                bidVolume: 19,
                bidPrice: 99.7,
                askPrice: 100.49,
                askVolume: 14,
                askCount: 1,
                currency: 'PLN'
            }
        ]);
    });
});
