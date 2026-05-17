import { type AgentTool } from '../agent/Tool';

type StockwatchInput = {
    companyName: string;
};

function isStockwatchInput(value: unknown): value is StockwatchInput {
    return (
        typeof value === 'object' &&
        value !== null &&
        'companyName' in value &&
        typeof (value as Record<string, unknown>).companyName === 'string'
    );
}

const STOCKWATCH_BASE_URL = 'https://www.stockwatch.pl';
const STOCKWATCH_API_URL = 'https://api.stockwatch.pl';

const FETCH_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    'Referer': 'https://www.stockwatch.pl/',
};

const API_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.stockwatch.pl/',
    'Origin': 'https://www.stockwatch.pl',
};

export class StockwatchTool implements AgentTool {
    readonly name = 'stockwatch_financials';
    readonly description =
        "Preferred tool for structured financial data of Polish companies listed on GPW. " +
        "Fetches multi-year annual P&L (revenue, gross profit, EBIT, EBITDA, net income, operating CF) " +
        "and balance sheet (assets, equity, liabilities, cash, inventory) from stockwatch.pl. " +
        "Data is aggregated to annual figures in thousands PLN. " +
        "Use the company's common brand name or GPW ticker for best results " +
        "(e.g. 'Dadelo', 'Orlen', 'Cyfrowy Polsat').";
    readonly inputSchema: Record<string, unknown> = {
        type: 'object',
        properties: {
            companyName: {
                type: 'string',
                description: "Company name or brand to look up on stockwatch.pl (e.g. 'Play', 'Orlen', 'Cyfrowy Polsat')",
            },
        },
        required: ['companyName'],
    };

    async execute(input: unknown): Promise<string> {
        if (!isStockwatchInput(input)) {
            throw new Error('Invalid input: expected { companyName: string }');
        }

        const { companyName } = input;

        // Step 1: search using the stockwatch autocomplete API
        const apiUrl = `${STOCKWATCH_API_URL}/Capitalization/GetCompaniesAndIndeces?q=${encodeURIComponent(companyName)}`;
        const apiResponse = await fetch(apiUrl, { headers: API_HEADERS });
        if (!apiResponse.ok) {
            throw new Error(`HTTP ${apiResponse.status} fetching stockwatch search API`);
        }
        const results = await apiResponse.json() as Array<{ isin: string; name: string; ticker: string; type: string }>;

        if (!results || results.length === 0) {
            return `No matching company found on stockwatch.pl for "${companyName}". Try a shorter or different name.`;
        }

        // Pick the first result (most relevant match)
        const { name: matchedName, ticker } = results[0];

        // Step 2: fetch the financial data page using the comma-based URL format
        const financialUrl = `${STOCKWATCH_BASE_URL}/gpw/${ticker.toLowerCase()},notowania,dane-finansowe.aspx`;
        const financialHtml = await fetchPage(financialUrl);
        const tableText = extractTableText(financialHtml);

        if (tableText) {
            return `Financial data for "${matchedName}" from ${financialUrl}:\n\n${tableText}`;
        }

        return `Found company page for "${matchedName}" (${ticker}) but could not extract financial data tables.`;
    }
}

async function fetchPage(url: string): Promise<string> {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return response.text();
}

function extractTableText(html: string): string {
    // Target the financial data section specifically
    const sectionStart = html.indexOf('id="FinancialData_Async_Table"');
    if (sectionStart === -1) return '';

    const tableStart = html.indexOf('<table', sectionStart);
    const tableEnd = html.indexOf('</table>', tableStart);
    if (tableStart === -1 || tableEnd === -1) return '';

    const tableHtml = html.slice(tableStart, tableEnd + '</table>'.length);

    // Extract column periods (e.g. "Q1 2020", "Q2 2020", ...)
    const periods: string[] = [];
    const thPattern = /class="factPeriod"[^>]*><b>([^<]+)<\/b>/g;
    let m: RegExpExecArray | null;
    while ((m = thPattern.exec(tableHtml)) !== null) {
        periods.push(m[1].trim());
    }
    if (periods.length === 0) return '';

    // Parse data rows
    type DataRow = { label: string; isBalanceSheet: boolean; values: (number | null)[] };
    const rows: DataRow[] = [];
    let isBalanceSection = false;

    const rowPattern = /<tr([^>]*)>([\s\S]*?)<\/tr>/gi;
    while ((m = rowPattern.exec(tableHtml)) !== null) {
        const attrs = m[1];
        const rowHtml = m[2];

        // Skip dynamics rows (class="dyn")
        if (attrs.includes('class="dyn"')) continue;
        // Skip premium-locked rows
        if (rowHtml.includes('abo-lnk')) continue;

        // Extract all <td> contents
        const cells: string[] = [];
        const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        let tdMatch: RegExpExecArray | null;
        while ((tdMatch = tdPattern.exec(rowHtml)) !== null) {
            const text = tdMatch[1]
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            cells.push(text);
        }

        if (cells.length < 3) continue;

        const label = cells[0];
        if (!label) continue;

        // Detect balance sheet section start
        if (label.startsWith('Data bilansowa')) {
            isBalanceSection = true;
            continue;
        }

        // Rows that are snapshots in nature but appear outside the balance sheet section
        // (e.g. share count in the per-share block). Summing quarters would multiply the value by 4.
        const SNAPSHOT_LABELS = ['Liczba akcji', 'Liczba akcji (śr.)'];
        const isSnapshotRow = SNAPSHOT_LABELS.some(s => label.startsWith(s));

        // cells[0] = label, cells[1] = icon/empty col, cells[2..] = quarter values
        const values: (number | null)[] = cells.slice(2).map(v => {
            // Remove spaces used as thousands separators; handle "- 123" as -123
            const cleaned = v.replace(/\s/g, '').replace(',', '.');
            const n = parseFloat(cleaned);
            return isNaN(n) ? null : n;
        });

        while (values.length < periods.length) values.push(null);
        rows.push({
            label,
            isBalanceSheet: isBalanceSection || isSnapshotRow,
            values: values.slice(0, periods.length),
        });
    }

    if (rows.length === 0) return '';

    // Group period indices by year
    const yearSet = new Set(periods.map(p => p.split(' ')[1]));
    const yearList = Array.from(yearSet).sort();

    const yearPeriodIndices: Record<string, number[]> = {};
    for (const year of yearList) {
        yearPeriodIndices[year] = periods
            .map((p, i) => (p.endsWith(year) ? i : -1))
            .filter(i => i >= 0);
    }

    // Aggregate quarters to annual values
    const annual: Array<{ label: string; yearValues: Record<string, number | null> }> = [];
    for (const row of rows) {
        const yearValues: Record<string, number | null> = {};
        for (const year of yearList) {
            const indices = yearPeriodIndices[year] ?? [];
            if (indices.length === 0) {
                yearValues[year] = null;
                continue;
            }
            if (row.isBalanceSheet) {
                // Balance sheet items: take Q4 (end-of-year snapshot)
                const lastIdx = indices[indices.length - 1];
                yearValues[year] = row.values[lastIdx] ?? null;
            } else {
                // P&L / cash-flow items: sum all available quarters
                const vals = indices
                    .map(i => row.values[i])
                    .filter((v): v is number => v !== null);
                yearValues[year] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
            }
        }
        annual.push({ label: row.label, yearValues });
    }

    // Show only the most recent 5 years to keep output manageable
    const recentYears = yearList.slice(-5);

    const headerLine = `Metric | ${recentYears.join(' | ')}`;
    const separatorLine = recentYears.map(() => '---').join(' | ');
    const dataLines = annual.map(r => {
        const cells = recentYears.map(y => {
            const v = r.yearValues[y];
            return v === null ? '' : String(Math.round(v));
        });
        return `${r.label} | ${cells.join(' | ')}`;
    });

    return [
        'Data in thousands PLN (annual). Balance sheet rows = Q4 snapshot; P&L/CF rows = annual sum.',
        '',
        headerLine,
        separatorLine,
        ...dataLines,
    ].join('\n');
}
