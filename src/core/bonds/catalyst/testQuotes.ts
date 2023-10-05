import { getCurrentCatalystBondsQuotes, CatalystBondQuery } from ".";

(async () => {
    process.env.TEMP_FOLDER = '.';
    const quotes: CatalystBondQuery[] = await getCurrentCatalystBondsQuotes();
    console.log(`Fetched ${quotes.length} price queries`);
    console.log(quotes[1]);
})();
