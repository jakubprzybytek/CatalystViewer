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

const toOptionalFixed = (value: number, digits: number) => `${Number.parseFloat(value.toFixed(digits))}`;

export function formatCompactCurrency(value: number, currency: string) {
    var compactValue: number;
    var suffix: string = '';

    if (value >= 1000000000) {
        compactValue = value / 1000000000;
        suffix = 'G';
    } else if (value >= 1000000) {
        compactValue = value / 1000000;
        suffix = 'M';
    } else if (value >= 1000) {
        compactValue = value / 1000;
        suffix = 'k';
    } else {
        compactValue = value;
    }

    switch (currency) {
        case 'EUR':
            return `€${toOptionalFixed(compactValue, 2)}${suffix}`;
        case 'PLN':
            return `${toOptionalFixed(compactValue, 2).replace('.', ',')}${suffix} zł`;
    }

    return `${toOptionalFixed(compactValue, 2)}${suffix} ${currency}`;
}

export function formatDate(date: number): string {
    try {
        return format(date, "d-MM-yyyy");
    } catch (e) {
        console.error(`Cannot format date '${date}': ${e}`);
        return "n/a";
    }
}
