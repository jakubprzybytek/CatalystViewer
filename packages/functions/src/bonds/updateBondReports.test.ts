import { describe, expect, it, vi } from 'vitest';

const { getQuotesMock } = vi.hoisted(() => ({ getQuotesMock: vi.fn() }));

vi.mock('sst', () => ({ Resource: {} }));
vi.mock('@core/bonds/catalyst', () => ({
  getCurrentCatalystBondsQuotes: getQuotesMock,
  getLatestCatalystDailyStatistics: vi.fn(),
}));

import { handler, SKIPPED_UPDATE_RESULT } from './updateBondReports';

describe('updateBondReports handler', () => {
  it('skips the update when the input says updateBonds: false', async () => {
    const result = await handler({ updateBonds: false }, {} as never);

    expect(result).toEqual(SKIPPED_UPDATE_RESULT);
    expect(getQuotesMock).not.toHaveBeenCalled();
  });
});
