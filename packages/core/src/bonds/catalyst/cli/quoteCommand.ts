import { CatalystBondQuote, getCurrentCatalystBondsQuotes } from "..";

export async function quoteCommand(symbol: string) {
  console.log(`Quote: ${symbol}`);

  process.env.TEMP_FOLDER = '.';
  const quotes: CatalystBondQuote[] = await getCurrentCatalystBondsQuotes();
  console.log(`Fetched ${quotes.length} price queries`);

  const quote = quotes.find(quote => quote.name === symbol);
  console.log(quote);
}
