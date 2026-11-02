import { readSheet } from "read-excel-file/node";
import { readFileSync } from 'fs';
import { CatalystDailyStatisticsBondDetails } from "..";
import { parseUTCDate } from "../../../";

// Rows above this one (0-based) are the file's title and column headers.
const FIRST_DATA_ROW = 10;
// Column letter → index in a row (A = 0)
const col = (letter: string) => letter.charCodeAt(0) - 'A'.charCodeAt(0);

type Cell = string | number | boolean | Date | null | undefined;

const isEmpty = (cell: Cell) => cell === null || cell === undefined || cell === '';

export async function readCatalystDailyStatisticsXlsFile(fileName: string): Promise<CatalystDailyStatisticsBondDetails[]> {
    const rows = await readSheet(readFileSync(fileName), 'instrumenty') as Cell[][];

    const bonds: CatalystDailyStatisticsBondDetails[] = [];
    let bondType: string | undefined = undefined;

    for (const row of rows.slice(FIRST_DATA_ROW)) {
        const cell = (letter: string) => row[col(letter)];
        if (row.every(isEmpty)) continue;

        // row that defines bond type for rows below it (the only rows without an ISIN)
        if (isEmpty(cell('H'))) {
            bondType = String(cell('A')).split('/')[1].replace('  ', ' ');
            console.log(`Parsing bonds: ${bondType}`);
            continue;
        }

        // row that defines specific bond
        const maturityDay = cell('A');
        if (isEmpty(maturityDay)) {
            console.log('Skipping bond with empty maturity day', {
                isin: cell('H'),
                name: cell('I'),
                type: bondType || 'n/a',
            });
            continue;
        }

        const bondDetails: CatalystDailyStatisticsBondDetails = {
            name: cell('I') as string,
            isin: cell('H') as string,
            type: bondType || 'n/a',
            market: cell('E') as string,
            nominalValue: cell('D') as number,
            maturityDay: parseUTCDate(maturityDay as string),
            // an empty rate stays '' as it was with the previous reader (zero-coupon and new bonds)
            currentInterestRate: (isEmpty(cell('B')) ? '' : cell('B')) as number,
            accuredInterest: cell('C') as number,
            tradingCurrency: cell('K') as string,
            closingPrice: cell('L') as number
        }
        bonds.push(bondDetails);
    }

    console.log(`Parsed ${bonds.length} bonds`);

    return bonds;
}
