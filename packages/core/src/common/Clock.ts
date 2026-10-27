// "Now" for code whose results depend on the date (interest periods, liquidity windows, which daily
// statistics file to read). On int, REFERENCE_DATE pins it to the moment the fixtures were captured
// (tests/fixtures/metadata.json), so the same data gives the same results on any day. Elsewhere it is the real time.
export function now(referenceDate: string | undefined = process.env.REFERENCE_DATE): Date {
    if (!referenceDate) return new Date();

    const date = new Date(referenceDate);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid REFERENCE_DATE: '${referenceDate}'`);
    }
    return date;
}
