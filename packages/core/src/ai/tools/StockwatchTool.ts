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
        "Fetch financial data for a Polish company from stockwatch.pl. " +
        "Returns yearly financial indicators (revenue, EBITDA, net income, net debt, equity) " +
        "extracted from the company's profile page. Use the company's common brand name for best results " +
        "(e.g. 'Play' instead of 'P4 Sp. z o.o.').";
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
    const tables: string[] = [];

    // Extract table elements directly from the raw HTML.
    // Individual cell content is stripped of all tags below, so there is no need
    // to pre-process the full document.
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableHtml = tableMatch[1];
        const rows: string[] = [];

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const rowHtml = rowMatch[1];
            const cells: string[] = [];

            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch: RegExpExecArray | null;

            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                const cellContent = cellMatch[1]
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    // Replace &amp; last to avoid double-unescaping (e.g. &amp;lt; → &lt; → <)
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (cellContent) cells.push(cellContent);
            }

            if (cells.length > 0) {
                rows.push(cells.join(' | '));
            }
        }

        if (rows.length > 0) {
            tables.push(rows.join('\n'));
        }
    }

    return tables.join('\n\n---\n\n');
}
