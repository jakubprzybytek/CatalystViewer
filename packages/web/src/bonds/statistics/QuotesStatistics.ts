import { BondQuote } from '@/sdk';

export function getBids(quotes: BondQuote[]): number[] {
  return quotes
    .map(quote => quote.bid)
    .filter((bid): bid is number => !!bid);
};

export function getAsks(quotes: BondQuote[]): number[] {
  return quotes
    .map(quote => quote.ask)
    .filter((ask): ask is number => !!ask);
};

export function getClosePrices(quotes: BondQuote[]): number[] {
  return quotes
    .map(quote => quote.close)
    .filter((close): close is number => !!close);
};
