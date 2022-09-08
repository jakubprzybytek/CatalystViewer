import { readCatalystDailyStatisticsXlsFile } from "./CatalystDailyStatisticsXlsFile";
import { downloadLatestCatalystDailyStatisticsFile } from "./CatalystFetch";

export async function getLatestCatalystDailyStatistics() {
    const catalystDailyStatisticsFileName = await downloadLatestCatalystDailyStatisticsFile();
    return readCatalystDailyStatisticsXlsFile(catalystDailyStatisticsFileName);
};
