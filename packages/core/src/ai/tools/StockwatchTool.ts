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

const STOCKWATCH_BASE_URL = 'https://stockwatch.pl';

const FETCH_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
};

// Financial data tab paths to try in order
const FINANCIAL_TAB_PATHS = ['dane-finansowe/', 'wyniki-finansowe/'];

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

        // Step 1: search stockwatch.pl for the company
        const searchUrl = `${STOCKWATCH_BASE_URL}/szukaj/?q=${encodeURIComponent(companyName)}`;
        const searchHtml = await fetchPage(searchUrl);

        // Step 2: extract company path from search results (e.g. /gpw/P4S/ or /obligacje/P4/)
        const companyPath = extractCompanyPath(searchHtml);
        if (!companyPath) {
            return `No matching company found on stockwatch.pl for "${companyName}". Try a shorter or different name.`;
        }

        // Step 3: try each financial data tab path in order
        for (const tabPath of FINANCIAL_TAB_PATHS) {
            const financialUrl = `${STOCKWATCH_BASE_URL}${companyPath}${tabPath}`;
            try {
                const financialHtml = await fetchPage(financialUrl);
                const tableText = extractTableText(financialHtml);
                if (tableText) {
                    return `Financial data for "${companyName}" from ${financialUrl}:\n\n${tableText}`;
                }
            } catch (err) {
                // This tab path is not available; try the next one
                console.debug(`StockwatchTool: ${financialUrl} unavailable: ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        // Step 4: fall back to the main company page
        const mainUrl = `${STOCKWATCH_BASE_URL}${companyPath}`;
        const mainHtml = await fetchPage(mainUrl);
        const fallbackText = extractTableText(mainHtml);
        if (fallbackText) {
            return `Financial data for "${companyName}" from ${mainUrl}:\n\n${fallbackText}`;
        }

        return `Found company page at ${mainUrl} but could not extract financial data tables.`;
    }
}

async function fetchPage(url: string): Promise<string> {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return response.text();
}

function extractCompanyPath(html: string): string | null {
    // GPW/Catalyst tickers are 2–10 alphanumeric characters; emitent slugs can include
    // hyphens and be longer (up to 30 chars) for non-listed bond issuers.
    const patterns = [
        /href="(\/gpw\/[A-Za-z0-9]{2,10}\/)"/,
        /href="(\/obligacje\/[A-Za-z0-9]{2,10}\/)"/,
        /href="(\/emitent\/[A-Za-z0-9-]{2,30}\/)"/,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) return match[1];
    }

    return null;
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
