import { ObligacjeBondInformation } from ".";

const BOND_NAME_REGEX = /<h1>(\w+)<\/h1>/;
const ISSUER_REGEX = /"nazwa-emitenta">(.+)<\/a>/;
const MARKET_REGEX = /<th>Rynek:<\/th>\s+<td>(.+)<\/td>/;
const EMISSION_VALUE_REGEX = /<th>Wartość emisji w obrocie:<\/th>\s+<td>(.+) \w{3}<\/td>/;
const NOMINAL_VALUE_REGEX = /<th>Wartość nominalna:<\/th>\s+<td>(.+) \w{3}<\/td>/;
const INTEREST_TYPE_REGEX = /<th>Typ oprocentowania:<\/th>\s+<td>(.+)<\/td>/;
const CURRENCY_REGEX = /<th>Wartość nominalna:<\/th>\s+<td>.+ (\w{3})<\/td>/;

function firstGroup(markup: string, regexp: RegExp): string {
    const regexpMatch = markup.match(regexp);

    if (regexpMatch === null) {
        throw Error(`Cannot find match using ${regexp}`);
    }

    return regexpMatch[1];
}

export function parseObligacjeBondInformationPage(markup: string): ObligacjeBondInformation {
    return {
        name: firstGroup(markup, BOND_NAME_REGEX),
        issuer: firstGroup(markup, ISSUER_REGEX),
        market: firstGroup(markup, MARKET_REGEX),
        emissionValue: Number(firstGroup(markup, EMISSION_VALUE_REGEX).replaceAll(' ', '')),
        nominalValue: Number(firstGroup(markup, NOMINAL_VALUE_REGEX).replaceAll(' ', '')),
        interestType: firstGroup(markup, INTEREST_TYPE_REGEX).replaceAll('  ', ' '),
        currency: firstGroup(markup, CURRENCY_REGEX),
    };
};