import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerFinancialsTable, type DbIssuerFinancialsRecord } from '@core/storage/issuerFinancials';
import type { FilingExtraction, ParsedFiling } from '@core/bonds/fundamentals/filings/FilingParser';
import type { StatementLine } from '@core/bonds/fundamentals/filings/statementLines';
import { Failure, lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

// One filed year's full statements (every stored line), for the Financials view. Amounts in units of
// the currency, as stored; the page shows them in the unit the report printed.
export type IssuerStatementsView = {
    issuerName: string;
    periodStart: string;
    periodEnd: string;
    scope: 'single' | 'group';
    currency: string;
    format: ParsedFiling['format'];
    standard?: ParsedFiling['standard'];
    presentedUnit: 1 | 1000 | 1000000;
    lineSigns?: ParsedFiling['lineSigns'];
    review?: DbIssuerFinancialsRecord['review'];
    extraction?: FilingExtraction;     // PDF: the model read the lines came from
    lines: StatementLine[];            // empty for a year imported before lines were stored
};

export function buildIssuerStatements(row: DbIssuerFinancialsRecord): IssuerStatementsView {
    return {
        issuerName: row.issuerName,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        scope: row.scope,
        currency: row.currency,
        format: row.filing.format ?? 'krs-xml',
        standard: row.standard,
        presentedUnit: row.presentedUnit ?? 1,
        lineSigns: row.lineSigns,
        review: row.review,
        extraction: row.linesExtraction ?? row.filing.extraction,
        lines: [...(row.lines ?? [])].sort((a, b) => STATEMENTS.indexOf(a.statement) - STATEMENTS.indexOf(b.statement) || a.order - b.order),
    };
}

const STATEMENTS = ['balance', 'income', 'cashFlow'];

// GET /api/issuers/{name}/statements?period=YYYY-MM-DD&scope=group|single
export const handler = lambdaHandler(async (event) => {
    const issuerName = decodeURIComponent(event.pathParameters?.name ?? '');
    const periodEnd = event.queryStringParameters?.period ?? '';
    const scope = event.queryStringParameters?.scope ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) || !['group', 'single'].includes(scope)) {
        return Failure('Parameters: period=YYYY-MM-DD and scope=group|single');
    }
    const table = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);
    // The issuer's own row for that year (the issuer's company), then the row with its lines
    const year = (await table.getByIssuer(issuerName)).find(r => r.periodEnd === periodEnd && r.scope === scope);
    const row = year && await table.get(year.entityId, year.period);
    if (!row) return Failure(`No ${scope} report of ${issuerName} for ${periodEnd}`, 404);
    return Success(buildIssuerStatements(row));
});
