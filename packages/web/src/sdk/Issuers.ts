import { get, post } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';

const ISSUER_PROFILES_PATH = '/api/issuers/profiles';
const ISSUER_ANALYSIS_PATH = (name: string) => `/api/issuers/${encodeURIComponent(name)}/analysis`;

// Where the scorecard's figures come from: the issuer's filed statements (KRS XML, ESEF or IFRS report)
// or the AI analysis.
export type FinancialsSource =
  | { kind: 'filing'; format?: 'krs-xml' | 'esef' | 'ifrs-text'; scope: 'single' | 'group'; latestPeriodEnd: string; years: number }
  | { kind: 'ai'; performedAt: string };

export type IssuerProfile = {
  issuerName: string;
  industry: string;
  businessSummary: string;
  websiteUrl?: string;
  classifiedAtTs?: number;
  scorecard?: FundamentalScorecard;
  financialsSource?: FinancialsSource;
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