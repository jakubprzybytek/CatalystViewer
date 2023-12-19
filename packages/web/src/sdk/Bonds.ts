import { API, Auth } from "aws-amplify";
import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { BondReportsQueryResult, BondReport, BondQuotesQueryResult } from '@catalyst-viewer/functions/bonds';

export type { BondReportsQueryResult, BondReport, BondDetails, BondCurrentValues };
export type { BondQuotesQueryResult };

export async function getBondReports(bondType?: string): Promise<BondReportsQueryResult> {
  const path = '/api/bonds' + (bondType ? `/${bondType}` : '');
  return await API.get('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
  });
}

export async function getBondQuotes(bondName: string, market: string): Promise<BondQuotesQueryResult> {
  const path = `/api/bondQuotes?bond=${bondName}&market=${market}`;
  return await API.get('api', path, {
    headers: {
      Authorization: `Bearer ${(await Auth.currentSession())
        .getAccessToken()
        .getJwtToken()}`,
    },
  });
}
