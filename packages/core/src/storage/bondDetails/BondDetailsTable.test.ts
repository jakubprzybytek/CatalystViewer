import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, fromMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const fromMock = vi.fn(() => ({ send: sendMock }));
  return { sendMock, fromMock };
});

vi.mock('@aws-sdk/lib-dynamodb', () => {
  class BatchWriteCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    DynamoDBDocumentClient: { from: fromMock },
    BatchWriteCommand,
  };
});

import { DbBondDetails, BondDetailsTable } from '.';

describe('BondDetailsTable', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    sendMock.mockReset();
    fromMock.mockClear();
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('logs the bond identity when maturityDay is invalid', async () => {
    const table = new BondDetailsTable({} as never, 'BondDetailsTable');
    const bond = {
      isin: 'PL0000000001',
      name: 'Example Bond',
      market: 'CATALYST',
      issuer: 'Example Issuer',
      maturityDay: new Date('invalid'),
    } as DbBondDetails;

    await expect(table.storeAll([bond])).rejects.toThrow('Invalid maturityDay for bond PL0000000001');

    expect(sendMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Invalid DbBondDetails maturityDay',
      expect.objectContaining({
        isin: 'PL0000000001',
        name: 'Example Bond',
        market: 'CATALYST',
        issuer: 'Example Issuer',
        maturityDay: bond.maturityDay,
      }),
    );
  });
});