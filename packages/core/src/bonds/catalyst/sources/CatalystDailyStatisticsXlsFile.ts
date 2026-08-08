import { utils, read } from "xlsx";
import { readFileSync } from 'fs';
import { CatalystDailyStatisticsBondDetails } from "..";
import { parseUTCDate } from "../../../";

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
            const maturityDay = row['A' as keyof typeof row] as string | undefined;
            if (maturityDay === undefined || maturityDay === null || maturityDay === '') {
                console.log('Skipping bond with empty maturity day', {
                    isin: row['H' as keyof typeof row],
                    name: row['I' as keyof typeof row],
                    type: bondType || 'n/a',
                });
                continue;
            }

            const bondDetails: CatalystDailyStatisticsBondDetails = {
                name: row['I' as keyof typeof row] as string,
                isin: row['H' as keyof typeof row] as string,
                type: bondType || 'n/a',
                market: row['E' as keyof typeof row] as string,
                nominalValue: row['D' as keyof typeof row] as number,
                maturityDay: parseUTCDate(maturityDay),
                currentInterestRate: row['B' as keyof typeof row] as number,
                accuredInterest: row['C' as keyof typeof row] as number,
                tradingCurrency: row['K' as keyof typeof row] as string,
                closingPrice: row['L' as keyof typeof row] as number
            }
            bonds.push(bondDetails);
        }
    }

    console.log(`Parsed ${bonds.length} bonds`);

    return bonds;
}
