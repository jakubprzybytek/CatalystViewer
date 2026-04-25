import { get } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";

export type IssuerProfile = {
    issuerName: string;
    industry: string;
    businessSummary: string;
};

export async function getIssuerProfiles(): Promise<IssuerProfile[]> {
    try {
        const session = await fetchAuthSession();
        const response = await get({
            apiName: 'api',
            path: '/api/issuers/profiles',
            options: {
                headers: {
                    Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
                },
            },
        }).response;
        const data = (await response.body.json()) as unknown as { issuerProfiles: IssuerProfile[] };
        return data.issuerProfiles;
    } catch (error) {
        console.log('Failed to fetch issuer profiles:', error);
        return [];
    }
}
