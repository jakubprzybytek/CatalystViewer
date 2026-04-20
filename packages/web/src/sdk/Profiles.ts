import { get, put } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";
import { Profile } from "@/common/Profile";

const PROFILE_PATH = '/api/profile';

export async function getProfile(): Promise<Profile | undefined> {
  try {
    const session = await fetchAuthSession();
    const response = await get({
      apiName: 'api',
      path: PROFILE_PATH,
      options: {
        headers: {
          Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
        },
      },
    }).response;
    return (await response.body.json()) as unknown as Profile;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function putProfile(profile: Profile): Promise<any> {
  const session = await fetchAuthSession();
  const response = await put({
    apiName: 'api',
    path: PROFILE_PATH,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
      body: profile as any,
    },
  }).response;
  return response;
}
