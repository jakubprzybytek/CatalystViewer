// "Today" for date-dependent figures (yield to maturity, interest progress, liquidity chart range).
// On int it is the fixtures' reference date (NEXT_PUBLIC_REFERENCE_DATE, set in infra/web.ts), elsewhere the real date.
export function today(): Date {
  const referenceDate = process.env.NEXT_PUBLIC_REFERENCE_DATE;
  return referenceDate ? new Date(referenceDate) : new Date();
}
