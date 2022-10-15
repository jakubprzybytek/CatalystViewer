import { downloadLatestCatalystDailyStatisticsFile } from "./CatalystDownload";
import { readCatalystDailyStatisticsXlsFile } from "./CatalystDailyStatisticsXlsFile";

export async function getLatestCatalystDailyStatistics() {
    const catalystDailyStatisticsFileName = await downloadLatestCatalystDailyStatisticsFile();
    return readCatalystDailyStatisticsXlsFile(catalystDailyStatisticsFileName);
};
