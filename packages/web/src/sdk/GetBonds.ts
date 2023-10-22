import { API, Auth } from "aws-amplify";
import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { BondReportsQueryResult, BondReport } from '@catalyst-viewer/functions/bonds';

export type { BondReportsQueryResult, BondReport, BondDetails, BondCurrentValues };

export async function getBonds(bondType?: string): Promise<BondReportsQueryResult> {
  const path = '/api/bonds' + (bondType ? `/${bondType}` : '');
  return await API.get('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
  });
}
