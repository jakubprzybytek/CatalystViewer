// npx esrun .\services\bonds\catalyst\testStats.ts

import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from ".";

(async () => {
    process.env.TEMP_FOLDER = '.';
    const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();
    console.log(`Fetched ${bondsStats.length} bond statistics`);
    console.log(bondsStats[1]);
})();
