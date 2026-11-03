import type { FinancialsCoverage } from '@/sdk/Issuers';

type Company = NonNullable<FinancialsCoverage['company']>;

export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// "Poland · KRS 0000272669 · LEI 2594008TBOIVL14UFL47", "Netherlands · reg. no. 81928491 · LEI …"
export function registrationParts(company: Company): string[] {
  return [
    company.country ? countryName(company.country) : 'Country unknown',
    company.krs ? `KRS ${company.krs}` : company.registeredAs ? `reg. no. ${company.registeredAs}` : undefined,
    company.lei ? `LEI ${company.lei}` : undefined,
  ].filter((p): p is string => !!p);
}

// The registration line with the legal name and the LEI's state: "ORLEN SPÓŁKA AKCYJNA · Poland · KRS … · LEI … (lapsed)"
export function identityParts(company: Company, leiStatus?: string): string[] {
  const parts = registrationParts(company);
  const lapsed = leiStatus && leiStatus !== 'ISSUED' ? ` (${leiStatus.toLowerCase()})` : '';
  return [company.name, ...parts.map(p => (p.startsWith('LEI ') ? `${p}${lapsed}` : p))].filter(Boolean);
}

// Annual reports imported: "Reports 2025" (the latest fiscal year's end year), or undefined.
export function reportsLabel(coverage: FinancialsCoverage | undefined): string | undefined {
  const filed = coverage?.filed;
  return filed ? `Reports ${filed.latestPeriodEnd.slice(0, 4)}` : undefined;
}
