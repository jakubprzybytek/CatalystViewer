import { get } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";

const ISSUER_PROFILES_PATH = '/api/issuers/profiles';

export type IssuerProfile = {
  issuerName: string;
  industry: string;
  businessSummary: string;
};

type IssuerProfilesQueryResult = {
  issuerProfiles: IssuerProfile[];
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