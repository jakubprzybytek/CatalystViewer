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