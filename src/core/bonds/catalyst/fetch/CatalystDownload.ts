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
    })
        .then(response => {
            if (response.status === 200 && response.headers['content-type'] === 'application/vnd.ms-excel') {
                return response.data;
            } else {
                throw Error(`Cannot fetch: ${response.statusText} / content-type: ${response.headers['content-type']}`);
            }
        })
        .catch(error => {
            throw Error(`Cannot fetch: ${error}`);
        });

    console.log(`Storing as: ${fileNameToSave}`);
    writeFileSync(fileNameToSave, response, { encoding: null });
}

export async function downloadLatestCatalystDailyStatisticsFile(): Promise<string> {
    if (process.env.TEMP_FOLDER === undefined) {
        throw new Error('Temp folder is not defined');
    }

    let reportDay = subDays(new Date(), 1);
    while ((getDay(reportDay) + 1) % 7 < 2) { // skip Saturday and Sunday
        reportDay = subDays(reportDay, 1);
    }

    const fileName = `catalyst_${format(reportDay, 'yyyyMMdd')}.xls`;
    console.log(`Daily statistics xls file: ${fileName}`);

    const localFileName = `${process.env.TEMP_FOLDER}/${fileName}`;
    console.log('cwd: ' + process.cwd())

    if (existsSync(localFileName)) {
        console.log(`File ${localFileName} already exists. Skipping downloading.`);
    } else {
        const url = `https://gpwcatalyst.pl/pub/CATALYST/statystyki/statystyki_dzienne/${fileName}`;
        await downloadCatalystFile(url, localFileName);
    }

    return localFileName;
}
