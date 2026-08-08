import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gunzipSync } from 'zlib';

const { getBondInformationMock } = vi.hoisted(() => ({
  getBondInformationMock: vi.fn(),
}));

vi.mock('@core/bonds/obligacjepl', () => ({
  getBondInformation: getBondInformationMock,
}));

import { handler } from './getBondInformation';

function parseBody(response: { body: string; isBase64Encoded?: boolean }): unknown {
  if (response.isBase64Encoded) {
    return JSON.parse(gunzipSync(Buffer.from(response.body, 'base64')).toString('utf-8'));
  }
  return JSON.parse(response.body);
}

describe('getBondInformation handler', () => {
  beforeEach(() => {
    getBondInformationMock.mockReset();
  });

  it('returns 400 when bond is missing or blank', async () => {
    for (const queryStringParameters of [undefined, {}, { bond: '   ' }]) {
      const response = await handler({ queryStringParameters } as never, {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

      expect(response.statusCode).toBe(400);
      expect(parseBody(response)).toEqual({ message: "Mandatory parameter is missing: 'bond'" });
    }

    expect(getBondInformationMock).not.toHaveBeenCalled();
  });

  it('trims the bond name and returns its information', async () => {
    const bondInformation = {
      name: 'IPT0627',
      issuer: 'Issuer',
      market: 'GPW RR',
      nominalValue: 100,
      issueValue: 1000000,
      interestType: 'stałe 5%',
      interestVariable: undefined,
      interestConst: 5,
      currency: 'PLN',
      interestFirstDays: ['2026-01-01'],
      interestRightsDays: ['2026-03-01'],
      interestPayoffDays: ['2026-04-01'],
      interestPeriods: [{ firstDay: '2026-01-01', rightsDay: '2026-03-01', payoffDay: '2026-04-01' }],
    };
    getBondInformationMock.mockResolvedValue(bondInformation);

    const response = await handler({ queryStringParameters: { bond: ' IPT0627 ' } } as never, {} as never, undefined as never) as { statusCode: number; body: string; isBase64Encoded?: boolean };

    expect(response.statusCode).toBe(200);
    expect(parseBody(response)).toEqual(bondInformation);
    expect(getBondInformationMock).toHaveBeenCalledWith('IPT0627');
  });
});