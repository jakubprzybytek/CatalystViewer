import { get } from "aws-amplify/api";
import { fetchAuthSession } from "aws-amplify/auth";
import { BondDetails, BondCurrentValues } from '@catalyst-viewer/core/bonds';
import { BondReportsQueryResult, BondReport, BondQuotesQueryResult, BondQuote } from '@catalyst-viewer/functions/bonds';

export type { BondReport, BondDetails, BondCurrentValues, BondReportsQueryResult };
export type { BondQuote, BondQuotesQueryResult };

export async function getBondReports(bondType?: string): Promise<BondReportsQueryResult> {
  const path = '/api/bonds' + (bondType ? `/${bondType}` : '');
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;
  return (await response.body.json()) as unknown as BondReportsQueryResult;
}

export async function getBondQuotes(bondName: string, market: string): Promise<BondQuotesQueryResult> {
  const path = `/api/bondQuotes?bond=${bondName}&market=${market}`;
  const session = await fetchAuthSession();
  const response = await get({
    apiName: 'api',
    path,
    options: {
      headers: {
        Authorization: `Bearer ${session.tokens?.accessToken?.toString()}`,
      },
    },
  }).response;
  return (await response.body.json()) as unknown as BondQuotesQueryResult;
}
