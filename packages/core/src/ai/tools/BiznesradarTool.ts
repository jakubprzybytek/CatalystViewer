import { type AgentTool } from '../agent/Tool';

type BiznesradarInput = {
    companyName: string;
};

function isBiznesradarInput(value: unknown): value is BiznesradarInput {
    return (
        typeof value === 'object' &&
        value !== null &&
        'companyName' in value &&
        typeof (value as Record<string, unknown>).companyName === 'string'
    );
}

type AutocompleteEntry = {
    shortName: string;
    mediumName: string;
    fullName: string;
    ut: string;
    qp: number;
};

const BASE_URL = 'https://www.biznesradar.pl';

const FETCH_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pl-PL,pl;q=0.9,en;q=0.8',
    'Referer': 'https://www.biznesradar.pl/',
};

const API_HEADERS: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Referer': 'https://www.biznesradar.pl/',
};

export class BiznesradarTool implements AgentTool {
    readonly name = 'biznesradar_financials';
    readonly description =
        'Fetch multi-year P&L and balance sheet data for a Polish listed company from biznesradar.pl. ' +
        'Returns yearly tables (up to 8 years) with revenue, EBIT, EBITDA, interest expense, net income, ' +
        'total assets, intangibles, equity, current assets, inventory, and cash. ' +
        'All values are in thousands PLN. Use the company\'s common name, brand, or WSE ticker. ' +
        'This is the preferred tool for structured financial data — use it before web_search.';

    readonly inputSchema: Record<string, unknown> = {
        type: 'object',
        properties: {
            companyName: {
                type: 'string',
                description: "Company common name or WSE ticker (e.g. 'Dadelo', 'DAD', 'Echo Investment', 'ORLEN')",
            },
        },
        required: ['companyName'],
    };

    async execute(input: unknown): Promise<string> {
        if (!isBiznesradarInput(input)) {
            throw new Error('Invalid input: expected { companyName: string }');
        }

        const { companyName } = input;

        const entry = await this.findEntry(companyName);
        if (!entry) {
            return `No matching company found on biznesradar.pl for "${companyName}". ` +
                'Try a shorter name, brand name, or WSE ticker symbol.';
        }

        const { ut, shortName, fullName } = entry;
        const plUrl = `${BASE_URL}/raporty-finansowe-rachunek-zyskow-i-strat/${ut}`;
        const bsUrl = `${BASE_URL}/raporty-finansowe-bilans/${ut}`;

        const [plHtml, bsHtml] = await Promise.all([
            fetchPage(plUrl),
            fetchPage(bsUrl),
        ]);

        const plText = extractFinancialTable(plHtml);
        const bsText = extractFinancialTable(bsHtml);

        if (!plText && !bsText) {
            return `Found "${fullName}" (${shortName}) on biznesradar.pl but could not extract financial data tables.`;
        }

        const lines: string[] = [
            `Financial data for "${fullName}" (${shortName}) from biznesradar.pl`,
            `Source: ${plUrl}`,
            `Unit: thousands PLN`,
        ];
        if (plText) {
            lines.push('', '=== P&L (Rachunek zysków i strat) ===', plText);
        }
        if (bsText) {
            lines.push('', '=== Balance Sheet (Bilans) ===', bsText);
        }
        return lines.join('\n');
    }

    private async findEntry(query: string): Promise<AutocompleteEntry | null> {
        const resp = await fetch(
            `${BASE_URL}/comperative-analysis-autocomplete-json/`,
            { headers: API_HEADERS }
        );
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status} fetching biznesradar autocomplete`);
        }
        const entries = await resp.json() as AutocompleteEntry[];
        const q = query.toLowerCase().trim();

        // 1. Exact ticker match (shortName or ut)
        const byTicker = entries.find(e =>
            e.shortName.toLowerCase() === q || e.ut.toLowerCase() === q
        );
        if (byTicker) return byTicker;

        // 2. Exact full/medium name match
        const byExactName = entries.find(e =>
            e.mediumName.toLowerCase() === q || e.fullName.toLowerCase() === q
        );
        if (byExactName) return byExactName;

        // 3. Full name contains query (prefer stocks qp=2 over bonds)
        const byPartial = entries
            .filter(e => e.fullName.toLowerCase().includes(q) || e.mediumName.toLowerCase().includes(q))
            .sort((a, b) => a.qp - b.qp); // qp=2 = stock, qp=3 = bond
        if (byPartial.length > 0) return byPartial[0];

        return null;
    }
}

// ─── Page fetching ────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string> {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return response.text();
}

// ─── Table extraction ─────────────────────────────────────────────────────────

/**
 * Extract the main financial data table from a biznesradar.pl financial report page.
 * Cells contain values like "30 913" or "28 742r/r -7.02%~branża -4.32%" —
 * the year-on-year comparison decorations are stripped, leaving only the plain value.
 */
function extractFinancialTable(html: string): string {
    const rows: string[] = [];

    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableHtml = tableMatch[1];
        const tableRows: string[] = [];

        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch: RegExpExecArray | null;

        while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
            const rowHtml = rowMatch[1];
            const cells: string[] = [];

            const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellMatch: RegExpExecArray | null;

            while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                const raw = cellMatch[1]
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&amp;/g, '&')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Strip year-on-year comparison decorations (e.g. "r/r +7.02%~branża +4.32%")
                const cleaned = raw
                    .replace(/r\/r\s*[^\s].*/i, '')
                    .replace(/~.*$/, '')
                    .trim();

                if (cleaned) cells.push(cleaned);
            }

            if (cells.length >= 2) {
                tableRows.push(cells.join(' | '));
            }
        }

        if (tableRows.length > 0) {
            rows.push(...tableRows);
        }
    }

    return rows.join('\n');
}
