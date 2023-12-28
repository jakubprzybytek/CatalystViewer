import { API, Auth } from "aws-amplify";
import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { BondReportsQueryResult, BondReport, BondQuotesQueryResult, BondQuote } from '@catalyst-viewer/functions/bonds';

export type { BondReport, BondDetails, BondCurrentValues, BondReportsQueryResult };
export type { BondQuote, BondQuotesQueryResult };

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
