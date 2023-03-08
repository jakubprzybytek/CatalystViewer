export function parseUTCDate(dateString: string): Date {
    return new Date(dateString.replaceAll('.', '-') + 'T00:00:00.000Z');
}
