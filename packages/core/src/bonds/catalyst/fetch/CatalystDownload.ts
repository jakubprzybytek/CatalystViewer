import axios from 'axios';
import { writeFileSync, existsSync } from 'fs';
import { subDays, isWeekend, format } from 'date-fns';

const MAX_LOOKBACK_DAYS = 7;

async function tryDownloadCatalystFile(url: string, fileNameToSave: string): Promise<boolean> {
    const response = await axios({
        method: 'GET',
        url: url,
        headers: {
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        },
        responseType: 'arraybuffer'
    }).catch(() => null);

    if (!response || response.status !== 200 || response.headers['content-type'] !== 'application/vnd.ms-excel') {
        return false;
    }

    writeFileSync(fileNameToSave, response.data, { encoding: null });
    return true;
}

function previousTradingDay(date: Date): Date {
    let candidate = subDays(date, 1);
    while (isWeekend(candidate)) {
        candidate = subDays(candidate, 1);
    }
    return candidate;
}

export async function downloadLatestCatalystDailyStatisticsFile(): Promise<string> {
    if (process.env.TEMP_FOLDER === undefined) {
        throw new Error('Temp folder is not defined');
    }

    let reportDay = previousTradingDay(new Date());

    for (let attempt = 0; attempt < MAX_LOOKBACK_DAYS; attempt++) {
        const fileName = `catalyst_${format(reportDay, 'yyyyMMdd')}.xls`;
        const localFileName = `${process.env.TEMP_FOLDER}/${fileName}`;

        if (existsSync(localFileName)) {
            return localFileName;
        }

        const url = `https://gpwcatalyst.pl/pub/CATALYST/statystyki/statystyki_dzienne/${fileName}`;
        const downloaded = await tryDownloadCatalystFile(url, localFileName);
        if (downloaded) {
            return localFileName;
        }

        reportDay = previousTradingDay(reportDay);
    }

    throw new Error(`Could not find a Catalyst daily statistics file within the last ${MAX_LOOKBACK_DAYS} trading days`);
}
