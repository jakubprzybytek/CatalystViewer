import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from ".";

(async () => {
    process.env.TEMP_FOLDER = '.';
    const bondsStats: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();
    console.log(bondsStats[1]);
    console.log(bondsStats[1].maturityDay.getTime())
})();
