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

            // row that defines bond type for rows below it (the only rows without an ISIN)
            if (!('H' in row)) {
                bondType = (row['A' as keyof typeof row] as string).split('/')[1].replace('  ', ' ');
                console.log(`Parsing bonds: ${bondType}`);

                continue;
            }

            // row that defines specific bond
            // .xlsx files omit empty cells (.xls had them as ''), so default to '' to keep the same output
            const cells = { A: '', B: '', ...row } as Record<string, unknown>;
            const maturityDay = cells['A'] as string | undefined;
            if (maturityDay === undefined || maturityDay === null || maturityDay === '') {
                console.log('Skipping bond with empty maturity day', {
                    isin: cells['H'],
                    name: cells['I'],
                    type: bondType || 'n/a',
                });
                continue;
            }

            const bondDetails: CatalystDailyStatisticsBondDetails = {
                name: cells['I'] as string,
                isin: cells['H'] as string,
                type: bondType || 'n/a',
                market: cells['E'] as string,
                nominalValue: cells['D'] as number,
                maturityDay: parseUTCDate(maturityDay),
                currentInterestRate: cells['B'] as number,
                accuredInterest: cells['C'] as number,
                tradingCurrency: cells['K'] as string,
                closingPrice: cells['L'] as number
            }
            bonds.push(bondDetails);
        }
    }

    console.log(`Parsed ${bonds.length} bonds`);

    return bonds;
}
