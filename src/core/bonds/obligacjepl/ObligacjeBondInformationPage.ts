import * as R from 'ramda';
import { InterestType, ObligacjeBondInformation } from ".";

const BOND_NAME_REGEX = /<h1>(\w+)<\/h1>/;
const ISSUER_REGEX = /"nazwa-emitenta">(.+)<\/a>/;
const MARKET_REGEX = /<th>Rynek:<\/th>\s+<td>(.+)<\/td>/;
const NOMINAL_VALUE_REGEX = /<th>Wartość nominalna:<\/th>\s+<td>(.+) \w{3}<\/td>/;
const ISSUE_VALUE_REGEX = /<th>Wartość emisji w obrocie:<\/th>\s+<td>(.+) \w{3}<\/td>/;
const INTEREST_TYPE_REGEX = /<th>Typ oprocentowania:<\/th>\s+<td>(.+)<\/td>/;
const CURRENCY_REGEX = /<th>Wartość nominalna:<\/th>\s+<td>.+ (\w{3})<\/td>/;
const INTEREST_FIRST_DAYS_REGEX = /<h4>Pierwsze dni okresów odsetkowych<\/h4>.+?<ul>(.+?)<\/ul>/s;
const INTEREST_RIGHTS_DAYS_REGEX = /<h4>Dni ustalenia prawa do odsetek<\/h4>.+?<ul>(.+?)<\/ul>/s;
const INTEREST_PAYOFF_DAYS_REGEX = /<h4>Dni wypłaty odsetek<\/h4>.+?<ul>(.+?)<\/ul>/s;
const DAY_REGEX = /<li>(.+?)<\/li>/g;

const INTEREST_TYPE_VARIABLE_REGEX = /zmienne\s(.+)\s\+\s+([\w.]+)%/;
const INTEREST_TYPE_CONST_REGEX = /stałe\s+([\w.]+)%/;
const INTEREST_TYPE_ZERO_COUPON_REGEX = /obligacje\szerokuponowe\s\+\s0%/;

const unique = R.uniqBy(R.identity);

function firstGroup(markup: string, regexp: RegExp): string {
    const regexpMatch = markup.match(regexp);

    if (regexpMatch === null) {
        throw Error(`Cannot find match using ${regexp}`);
    }

    return regexpMatch[1];
}

function firstGroups(markup: string, regexp: RegExp): string[] {
    const regexpMatch = markup.matchAll(regexp);

    if (regexpMatch === null) {
        throw Error(`Cannot find match using ${regexp}`);
    }

    return [...regexpMatch].map((match) => match[1]);
}

export function parseInterestType(interestType: string): InterestType {
    const variableInterestRegexpMatch = interestType.match(INTEREST_TYPE_VARIABLE_REGEX);

    if (variableInterestRegexpMatch !== null) {
        return {
            variable: variableInterestRegexpMatch[1],
            const: Number(variableInterestRegexpMatch[2])
        }
    }

    const constInterestRegexpMatch = interestType.match(INTEREST_TYPE_CONST_REGEX);

    if (constInterestRegexpMatch !== null) {
        return {
            variable: undefined,
            const: Number(constInterestRegexpMatch[1])
        }
    }

    const zeroCouponInterestRegexpMatch = interestType.match(INTEREST_TYPE_ZERO_COUPON_REGEX);

    if (zeroCouponInterestRegexpMatch !== null) {
        return {
            variable: undefined,
            const: 0
        }
    }

    throw Error(`Cannot parse interest type: '${interestType}'!`);
}

export function parseObligacjeBondInformationPage(markup: string): ObligacjeBondInformation {
    const interestType = firstGroup(markup, INTEREST_TYPE_REGEX).replaceAll('  ', ' ');
    const interestTypeParsed = parseInterestType(interestType);

    return {
        name: firstGroup(markup, BOND_NAME_REGEX),
        issuer: firstGroup(markup, ISSUER_REGEX),
        market: firstGroup(markup, MARKET_REGEX),
        issueValue: Number(firstGroup(markup, ISSUE_VALUE_REGEX).replaceAll(' ', '')),
        nominalValue: Number(firstGroup(markup, NOMINAL_VALUE_REGEX).replaceAll(' ', '')),
        interestType: interestType,
        interestVariable: interestTypeParsed?.variable,
        interestConst: interestTypeParsed?.const,
        currency: firstGroup(markup, CURRENCY_REGEX),
        interestFirstDays: unique(firstGroups(firstGroup(markup, INTEREST_FIRST_DAYS_REGEX), DAY_REGEX)),
        interestRightsDays: unique(firstGroups(firstGroup(markup, INTEREST_RIGHTS_DAYS_REGEX), DAY_REGEX)),
        interestPayoffDays: unique(firstGroups(firstGroup(markup, INTEREST_PAYOFF_DAYS_REGEX), DAY_REGEX))
    };
};
