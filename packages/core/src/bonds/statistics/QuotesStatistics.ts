import { BondQuote } from '@storage/bondStatistics';

export function getTurnover(quotes: BondQuote[]): number[] {
    return quotes
        .filter(quote => quote.turnover > 0)
        .map(quote => quote.turnover);
}

export function getSpread(quotes: BondQuote[]): number[] {
    return quotes
        .filter(quote => quote.bid !== undefined && quote.ask !== undefined)
        .map(quote => (quote.ask as number) - (quote.bid as number))
        .filter((turnover): turnover is number => !!turnover);
}