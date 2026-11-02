import { describe, expect, it } from 'vitest';
import { registrationParts, reportsLabel } from './registration';

describe('registrationParts', () => {
  it('names the country and the identifiers', () => {
    expect(registrationParts({ name: 'P.A. NOVA S.A.', country: 'PL', krs: '0000272669', lei: '2594008TBOIVL14UFL47' }))
      .toEqual(['Poland', 'KRS 0000272669', 'LEI 2594008TBOIVL14UFL47']);
    expect(registrationParts({ name: 'Pepco Group N.V.', country: 'NL', lei: '213800OVMJPFP79OB449', registeredAs: '81928491' }))
      .toEqual(['Netherlands', 'reg. no. 81928491', 'LEI 213800OVMJPFP79OB449']);
    expect(registrationParts({ name: 'X', lei: '213800OVMJPFP79OB449' })).toEqual(['Country unknown', 'LEI 213800OVMJPFP79OB449']);
  });
});

describe('reportsLabel', () => {
  it('gives the latest report year', () => {
    expect(reportsLabel({ filed: { latestPeriodEnd: '2025-09-30', earliestPeriodEnd: '2023-09-30', years: 3, formats: ['esef'], scopes: ['group'], lastImportedAt: '' } })).toBe('Reports 2025');
    expect(reportsLabel({ ai: { performedAt: '', years: 3 } })).toBeUndefined();
    expect(reportsLabel(undefined)).toBeUndefined();
  });
});
