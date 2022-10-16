import { CatalystBondQuery } from '.';

const QUOTES_TABLE_REGEX_STRING = '{TITLE} \\({CURRENCY}\\).+?<table(.+?)<\/table>';
const QUOTE_ROW_REGEX = /<tr>(.+?)<\/tr>/sg;

const QUOTE_BOND_NAME_REGEX = /"o-instrumentach-instrument\?nazwa=(.+?)"/;
const QUOTE_MARKET_REGEX = /<td.+?class="col2">(.+?)<\/td>/;
const QUOTE_BID_ASK_REGEX = /"col4">(?<referencePrice>.+?)<\/td>.+?"col8">(?<lastDateTime>.+?)<\/td>.+?col10">(?<lastPrice>.+?)<\/td>.+?"col12">(?<bidCount>.+?)<\/td>.+?"col12">(?<bidVolume>.+?)<\/td>.+?"col12">(?<bidPrice>.+?)<\/td>.+?"col13">(?<askPrice>.+?)<\/td>.+?"col13">(?<askVolume>.+?)<\/td>.+?"col13">(?<askCount>.+?)<\/td>.+?/s;

function firstGroup(markup: string, regexp: RegExp): string {
    const regexpMatch = markup.match(regexp);

    if (regexpMatch === null) {
        throw Error(`Cannot find match using ${regexp}`);
    }

    return regexpMatch[1];
}

function firstOptionalGroup(markup: string, regexp: RegExp): string | undefined {
    return markup.match(regexp)?.[1];
}

function firstGroups(markup: string, regexp: RegExp): string[] {
    const regexpMatch = markup.matchAll(regexp);

    if (regexpMatch === null) {
        throw Error(`Cannot find match using ${regexp}`);
    }

    return [...regexpMatch].map((match) => match[1]);
}

function parseFloat(number: string): number {
    return Number.parseFloat(number.replace(',', '.'));
}

export function parseBondsQuotesPage(markup: string, title: string, currency: string): CatalystBondQuery[] {
    const QUOTES_TABLE_REGEX = new RegExp(QUOTES_TABLE_REGEX_STRING
        .replace('{TITLE}', title)
        .replace('{CURRENCY}', currency), 's');
    const quotesTable = firstGroup(markup, QUOTES_TABLE_REGEX);
    const quoteRows = firstGroups(quotesTable, QUOTE_ROW_REGEX);

    var currentBondName = 'n/a';

    const quotes = quoteRows
        .map((quoteRowMarkup) => {
            currentBondName = firstOptionalGroup(quoteRowMarkup, QUOTE_BOND_NAME_REGEX) || currentBondName;
            const result = QUOTE_BID_ASK_REGEX.exec(quoteRowMarkup);
            if (!result || !result.groups) {
                console.log(`Cannot parse: '${quoteRowMarkup}'`);
                return undefined;
            }

            const { groups: { referencePrice, lastDateTime, lastPrice, bidCount, bidVolume, bidPrice, askPrice, askVolume, askCount } } = result;

            return {
                name: currentBondName,
                market: firstGroup(quoteRowMarkup, QUOTE_MARKET_REGEX).replace('&nbsp;', ' '),
                ...(referencePrice !== '-' && { referencePrice: parseFloat(referencePrice) }),
                ...(lastDateTime.trim() !== '-' && { lastDateTime: lastDateTime.trim() }),
                ...(lastPrice.trim() !== '-' && { lastPrice: parseFloat(lastPrice) }),
                ...(bidCount !== '-' && { bidCount: Number.parseInt(bidCount) }),
                ...(bidVolume !== '-' && { bidVolume: Number.parseInt(bidVolume) }),
                ...(bidPrice !== '-' && { bidPrice: parseFloat(bidPrice) }),
                ...(askPrice !== '-' && { askPrice: parseFloat(askPrice) }),
                ...(askVolume !== '-' && { askVolume: Number.parseInt(askVolume) }),
                ...(askCount !== '-' && { askCount: Number.parseInt(askCount) }),
                currency
            };
        })
        .filter((quote): quote is CatalystBondQuery => quote !== undefined);

    return quotes;
};
