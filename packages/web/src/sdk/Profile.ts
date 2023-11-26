import { API, Auth } from "aws-amplify";
import { TransportProfile } from '@catalyst-viewer/functions/profile';
import { Profile } from "@/common/Profile";

export type { TransportProfile };

export async function getProfile(): Promise<Profile | undefined> {
  const path = '/api/profile';
  try {

    const response = await API.get('api', path, {
      headers: {
        Authorization: `Bearer ${(await Auth.currentSession())
          .getAccessToken()
          .getJwtToken()}`,
      },
    });

    return {
      bondsReportsBrowserSettings: JSON.parse(response.bondReportsBrowserSettings)
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function putProfile(profile: Profile): Promise<any> {
  const path = '/api/profile';
  const transportProfile: TransportProfile = {
    bondReportsBrowserSettings: JSON.stringify(profile.bondsReportsBrowserSettings)
  }
  return await API.put('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
    body: transportProfile
  });
}
