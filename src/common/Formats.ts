import { format } from 'date-fns';

const currencyFormatterBuilder = (currency: string) => (value: number) =>
    new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency
    }).format(value);

const currencyFormatters: Record<string, (value: number) => string> = {};

export function formatCurrency(value: number, currency: string) {
    if (!(currency in currencyFormatters)) {
        currencyFormatters[currency] = currencyFormatterBuilder(currency)
    }

    return currencyFormatters[currency](value);
}

export function formatDate(date: number): string {
    try {
        return format(date, "d-MM-yyyy");
    } catch(e) {
        console.error(`Cannot format date '${date}': ${e}`);
        return "n/a";
    }
}
