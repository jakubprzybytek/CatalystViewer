import { API, Auth } from "aws-amplify";
import { BondReport, BondDetails, BondCurrentValues } from '../../services/api/bonds';

export type { BondReport, BondDetails, BondCurrentValues };

export async function getBonds(): Promise<BondReport[]> {
  const path = '/api/bonds';
  return await API.get('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
  });
}
