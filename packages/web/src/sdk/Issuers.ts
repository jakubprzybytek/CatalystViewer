import { get } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";
import type { FundamentalScorecard } from '@/bonds/fundamentals/scorecard';

const ISSUER_PROFILES_PATH = '/api/issuers/profiles';
const ISSUER_ANALYSIS_PATH = (name: string) => `/api/issuers/${encodeURIComponent(name)}/analysis`;

export type IssuerProfile = {
  issuerName: string;
  industry: string;
  businessSummary: string;
  websiteUrl?: string;
  classifiedAtTs?: number;
  scorecard?: FundamentalScorecard;
  performedAt?: string;
};

type IssuerProfilesQueryResult = {
  issuerProfiles: IssuerProfile[];
};

type IssuerAnalysisQueryResult = {
  reportMarkdown: string;
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

export async function getIssuerAnalysis(issuerName: string): Promise<string> {
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
  return result.reportMarkdown;
}