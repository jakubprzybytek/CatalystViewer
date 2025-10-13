import { API, Auth } from "aws-amplify";
import { Profile } from "@/common/Profile";

const PROFILE_PATH = '/api/profile';

export async function getProfile(): Promise<Profile | undefined> {
  try {
    const response = await API.get('api', PROFILE_PATH, {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getAccessToken()
          .getJwtToken()}`,
      },
    });
    return response as Profile;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function putProfile(profile: Profile): Promise<any> {
  return await API.put('api', PROFILE_PATH, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
    body: profile
  });
}
