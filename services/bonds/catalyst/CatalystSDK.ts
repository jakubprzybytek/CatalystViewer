import axios from 'axios';
import { writeFileSync, existsSync } from 'fs';
import { subDays, getDay, format } from 'date-fns';

async function downloadCatalystFile(url: string, fileNameToSave: string) {
    console.log(`Fetching: ${url}`);

    const response = await axios({
        method: 'GET',
        url: url,
        headers: {
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
        },
        responseType: 'arraybuffer'
    });

    console.log(`Storing as: ${fileNameToSave}`);
    writeFileSync(fileNameToSave, response.data, { encoding: null });
}

export async function downloadLatestCatalystDailyStatistics(): Promise<string> {
    let previousDay = subDays(new Date(), 1);
    while ((getDay(previousDay) + 1) % 7 < 2) { // skip Saturday and Sunday
        previousDay = subDays(previousDay, 1);
    }

    const fileName = `catalyst_${format(previousDay, 'yyyyMMdd')}.xls`;
    console.log(`Daily statistics xls file: ${fileName}`);

    if (existsSync(fileName)) {
        console.log(`File ${fileName} already exists. Skipping downloading.`);
    } else {
        const url = `https://gpwcatalyst.pl/pub/CATALYST/statystyki/statystyki_dzienne/${fileName}`;
        await downloadCatalystFile(url, fileName);
    }

    return fileName;
}
