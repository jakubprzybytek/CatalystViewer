import { utils, read } from "xlsx";
import { readFileSync } from 'fs';
import { CatalystDailyStatisticsBondDetails } from ".";

export function readCatalystDailyStatisticsXlsFile(fileName: string): CatalystDailyStatisticsBondDetails[] {
    const fileBuffer = readFileSync(fileName);
    const workbook = read(fileBuffer);
    const workSheet = workbook.Sheets['instrumenty'];

    const rows = utils.sheet_to_json(workSheet, { header: 'A', range: 10 });

    const bonds: CatalystDailyStatisticsBondDetails[] = [];
    var bondType: string | undefined = undefined;

    for (let row of rows) {
        if (row !== null && typeof row === 'object') {

            // row that defines bond type for rows below it
            if (!('B' in row)) {
                bondType = (row['A' as keyof typeof row] as string).split('/')[1].replace('  ', ' ');
                console.log(`Parsing bonds: ${bondType}`);

                continue;
            }

            // row that defines specific bond
            const maturityDay = new Date((row['A' as keyof typeof row] as string).replaceAll('.', '-') + 'T00:00:00.000Z');

            const bondDetails: CatalystDailyStatisticsBondDetails = {
                name: row['I' as keyof typeof row],
                isin: row['H' as keyof typeof row],
                type: bondType || 'n/a',
                market: row['E' as keyof typeof row],
                nominalValue: row['D' as keyof typeof row],
                maturityDay,
                currentInterestRate: row['B' as keyof typeof row],
                accuredInterest: row['C' as keyof typeof row],
                tradingCurrency: row['K' as keyof typeof row],
                closingPrice: row['L' as keyof typeof row]
            }
            bonds.push(bondDetails);
        }
    }

    return bonds;
}
