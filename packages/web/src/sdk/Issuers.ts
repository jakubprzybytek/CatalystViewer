import { get, post } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';

const ISSUER_PROFILES_PATH = '/api/issuers/profiles';
const ISSUER_ANALYSIS_PATH = (name: string) => `/api/issuers/${encodeURIComponent(name)}/analysis`;

// Where the scorecard's figures come from: the issuer's filed statements (KRS XML, ESEF or IFRS report)
// or the AI analysis.
export type FinancialsSource =
  | { kind: 'filing'; format?: 'krs-xml' | 'esef' | 'ifrs-text' | 'ai-pdf'; scope: 'single' | 'group'; latestPeriodEnd: string; years: number }
  | { kind: 'ai'; performedAt: string };

// What's collected for an issuer, whatever the scorecard uses (for the Financials page).
export type FinancialsCoverage = {
  company?: { name: string; country?: string; krs?: string; lei?: string; registeredAs?: string };
  filed?: { latestPeriodEnd: string; earliestPeriodEnd: string; years: number; formats: ('krs-xml' | 'esef' | 'ifrs-text' | 'ai-pdf')[]; scopes: ('single' | 'group')[]; lastImportedAt: string };
  ai?: { performedAt: string; latestYear?: number; years: number };
};

export type IssuerProfile = {
  issuerName: string;
  industry: string;
  businessSummary: string;
  websiteUrl?: string;
  classifiedAtTs?: number;
  scorecard?: FundamentalScorecard;
  financialsSource?: FinancialsSource;
  financialsCoverage?: FinancialsCoverage;
  performedAt?: string;
};

type IssuerProfilesQueryResult = {
  issuerProfiles: IssuerProfile[];
};

export type AgentEvent =
  | { type: 'tool_use'; iteration: number; toolName: string; input: unknown }
  | { type: 'tool_result'; iteration: number; toolName: string; toolUseId: string; result: string; isError: boolean }
  | { type: 'end_turn'; iteration: number; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number; totalTokens: number };

export type IssuerAnalysis = {
  reportMarkdown: string;
  agentLog: AgentEvent[];
};

type IssuerAnalysisQueryResult = {
  reportMarkdown: string;
  agentLog: AgentEvent[];
};

export async function getIssuerProfiles(): Promise<IssuerProfile[]> {
  try {
    const session = await fetchAuthSession();
    const response = await get({
      apiName: 'api',
      path: ISSUER_PROFILES_PATH,
      options: {
        headers: {
          Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
        },
      },
    }).response;

    const result = (await response.body.json()) as unknown as IssuerProfilesQueryResult;
    return result.issuerProfiles ?? [];
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function getIssuerAnalysis(issuerName: string): Promise<IssuerAnalysis> {
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path: ISSUER_ANALYSIS_PATH(issuerName),
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;

  const result = (await response.body.json()) as unknown as IssuerAnalysisQueryResult;
  return { reportMarkdown: result.reportMarkdown, agentLog: result.agentLog ?? [] };
}

// An issuer's yearly figures from every source (GET /api/issuers/{name}/financials). Amounts in millions.
export type FinancialField =
  | 'revenue' | 'ebit' | 'depreciation' | 'interestExpense' | 'netProfit'
  | 'totalAssets' | 'intangibleAssets' | 'equity' | 'financialDebt' | 'cash'
  | 'currentAssets' | 'inventory' | 'currentLiabilities'
  | 'bonds' | 'minorityInterests' | 'operatingCashFlow' | 'capex';

export type FilingFormat = 'krs-xml' | 'esef' | 'ifrs-text' | 'ai-pdf';

export type FiledYear = {
  periodEnd: string;
  periodStart: string;
  months: number;
  scope: 'single' | 'group';
  currency: string;
  column: 'current' | 'previous';
  format: FilingFormat;
  schema: string;
  importedAt: string;
  checks: string[];
  notes: string[];
  extraction?: { model: string; promptVersion: string; pages: number[] };
  documentKey: string;
  documentUrl?: string;
  figures: Partial<Record<FinancialField, { value: number; source: string[] }>>;
};

export type AiYear = { year: number; figures: Partial<Record<FinancialField, number>> };

export type IssuerFinancials = {
  issuerName: string;
  filed: FiledYear[];
  ai?: { performedAt: string; years: AiYear[] };
  scorecardSource?: FinancialsSource;
};

export async function getIssuerFinancials(issuerName: string): Promise<IssuerFinancials> {
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path: `/api/issuers/${encodeURIComponent(issuerName)}/financials`,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;
  const result = (await response.body.json()) as unknown as IssuerFinancials;
  return { ...result, filed: result.filed ?? [] };
}

// One filed year's full statements (GET /api/issuers/{name}/statements). Values in units of the currency.
export type StatementName = 'balance' | 'income' | 'cashFlow';

export type StatementLine = {
  statement: StatementName;
  order: number;
  label: string;
  value: number;
  code?: string;      // KRS line code or XBRL concept
  anchor?: string;
  parent?: number;    // order of the subtotal it adds up into
  item?: string;      // the app's standard item
  page?: number;      // PDF page
};

export type IssuerStatements = {
  issuerName: string;
  periodStart: string;
  periodEnd: string;
  scope: 'single' | 'group';
  currency: string;
  format: FilingFormat;
  standard?: 'ifrs' | 'pl-uor';
  presentedUnit: 1 | 1000 | 1000000;
  lineSigns?: 'printed' | 'tagged';
  review?: { status: 'parsed' | 'hand-checked' | 'flagged'; note?: string; at?: string };
  extraction?: { model: string; promptVersion: string; pages: number[] };
  lines: StatementLine[];
};

export async function getIssuerStatements(issuerName: string, periodEnd: string, scope: 'single' | 'group'): Promise<IssuerStatements> {
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path: `/api/issuers/${encodeURIComponent(issuerName)}/statements`,
    options: {
      queryParams: { period: periodEnd, scope },
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;
  return (await response.body.json()) as unknown as IssuerStatements;
}

export async function triggerFundamentalAnalysis(issuerName: string): Promise<void> {
  const session = await fetchAuthSession();
  await post({
    apiName: 'api',
    path: `/api/issuers/${encodeURIComponent(issuerName)}/analysis/trigger`,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;
}