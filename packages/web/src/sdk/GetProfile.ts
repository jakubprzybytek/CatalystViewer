import { API, Auth } from "aws-amplify";

export async function getProfile(): Promise<any> {
  const path = '/api/profile';
  return await API.get('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
  });
}
