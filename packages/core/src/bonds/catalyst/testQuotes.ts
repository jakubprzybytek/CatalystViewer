// npx esrun .\packages\core\src\bonds\catalyst\testQuotes.ts

import { getCurrentCatalystBondsQuotes, CatalystBondQuote } from ".";

(async () => {
    process.env.TEMP_FOLDER = '.';
    const quotes: CatalystBondQuote[] = await getCurrentCatalystBondsQuotes();
    console.log(`Fetched ${quotes.length} price queries`);
    console.log(quotes[1]);
})();
