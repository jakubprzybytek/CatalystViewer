// Parses an IFRS annual report in the European Single Electronic Format (ESEF): inline XBRL (iXBRL)
// tagged with the IFRS taxonomy, as listed companies publish them (consolidated statements are tagged).
// Takes the report package (.zip) or the report itself (.xhtml). Figures are read in code from the tags,
// with no LLM, and each keeps the concepts it came from (e.g. "ifrs-full:NoncurrentLeaseLiabilities").
//
// Financial debt is the sum of the liability lines that are borrowings, bonds or leases. With the package,
// the lines are the ones the filer's calculation linkbase sums into current and non-current liabilities,
// and the filer's own (extension) concepts are classified by the IFRS concept they're anchored to, or by
// their label. With the .xhtml alone, it falls back to the standard IFRS debt concepts.
import { readZip, isZip } from './zip';
import { UnsupportedFilingError, type FilingField, type FilingPeriod, type FilingScope, type ParsedFiling, type SourcedFigure } from './FilingParser';

// ─── Inline XBRL facts ──────────────────────────────────────────────────────────

type Context = { id: string; entity: string; scheme: string; start?: string; end?: string; instant?: string; dimensional: boolean };
type Fact = { concept: string; context: string; unit?: string; value: number; decimals?: string };

const decode = (s: string) => s
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const stripTags = (s: string) => decode(s.replace(/<[^>]*>/g, ''));

function attrs(tag: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const m of tag.matchAll(/([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]] = decode(m[3] ?? m[4] ?? '');
    return out;
}

// ixt transformation formats: "1 234,5" (comma decimal), "1,234.5" (dot decimal), "-" (zero dash).
export function parseIxNumber(raw: string, format: string | undefined): number | undefined {
    const f = (format ?? '').toLowerCase();
    const text = raw.trim();
    if (/zero|dash/.test(f) || /^[-–—]$/.test(text)) return 0;
    let digits: string;
    if (/comma-?decimal|numcommadecimal/.test(f)) digits = text.replace(/[^\d,]/g, '').replace(',', '.');
    else if (/dot-?decimal|numdotdecimal/.test(f) || f === '') digits = text.replace(/[^\d.]/g, '');
    else if (/num-?word|word/.test(f)) return undefined;
    else digits = text.replace(/[^\d.,]/g, '').replace(/,(?=\d{3}\b)/g, '').replace(',', '.');
    if (digits === '' || digits === '.') return undefined;
    const value = Number(digits);
    return Number.isFinite(value) ? value : undefined;
}

function readContexts(xhtml: string): Map<string, Context> {
    const contexts = new Map<string, Context>();
    for (const m of xhtml.matchAll(/<(?:[\w-]+:)?context\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?context>/g)) {
        const id = attrs(m[1]).id;
        const body = m[2];
        const identifier = body.match(/<(?:[\w-]+:)?identifier\b([^>]*)>([^<]*)</);
        const date = (name: string) => body.match(new RegExp(`<(?:[\\w-]+:)?${name}>\\s*([^<\\s]+)\\s*<`))?.[1]?.slice(0, 10);
        contexts.set(id, {
            id,
            entity: identifier?.[2].trim() ?? '',
            scheme: identifier ? attrs(identifier[1]).scheme ?? '' : '',
            start: date('startDate'),
            end: date('endDate'),
            instant: date('instant'),
            dimensional: /<(?:[\w-]+:)?(segment|scenario)\b/.test(body),
        });
    }
    return contexts;
}

function readUnits(xhtml: string): Map<string, string> {
    const units = new Map<string, string>();
    for (const m of xhtml.matchAll(/<(?:[\w-]+:)?unit\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?unit>/g)) {
        const measure = m[2].match(/<(?:[\w-]+:)?measure>\s*([^<\s]+)\s*</)?.[1] ?? '';
        units.set(attrs(m[1]).id, measure.replace(/^iso4217:/i, ''));
    }
    return units;
}

function readFacts(xhtml: string): Fact[] {
    const facts: Fact[] = [];
    // Nested ix:nonFraction is allowed but rare; the outer tag's text then contains the inner one.
    for (const m of xhtml.matchAll(/<([\w-]+:)?nonFraction\b([^>]*?)(?:\/>|>([\s\S]*?)<\/\1?nonFraction>)/g)) {
        const a = attrs(m[2]);
        if (a['xsi:nil'] === 'true' || !a.name || !a.contextRef) continue;
        const parsed = parseIxNumber(stripTags(m[3] ?? ''), a.format);
        if (parsed === undefined) continue;
        const scale = Number(a.scale ?? 0);
        facts.push({
            concept: a.name,
            context: a.contextRef,
            unit: a.unitRef,
            value: (a.sign === '-' ? -1 : 1) * parsed * Math.pow(10, Number.isFinite(scale) ? scale : 0),
            decimals: a.decimals,
        });
    }
    return facts;
}

function nonNumeric(xhtml: string, localName: string): string | undefined {
    const m = xhtml.match(new RegExp(`<([\\w-]+:)?nonNumeric\\b[^>]*name="[\\w-]+:${localName}"[^>]*>([\\s\\S]*?)<\\/\\1?nonNumeric>`));
    return m ? stripTags(m[2]).replace(/\s+/g, ' ').trim() : undefined;
}

// ─── Package taxonomy: calculation tree, anchors, labels ────────────────────────

type Taxonomy = {
    children: Map<string, { concept: string; weight: number }[]>;  // calculation: parent → children
    anchors: Map<string, string[]>;                                // extension concept → wider IFRS concepts
    labels: Map<string, string>;                                   // extension concept → label
};

// "…/ifrs-full-2022.xsd#ifrs-full_Borrowings" or "dom-2022.xsd#dom_Bonds" → "ifrs-full:Borrowings"
function conceptFromHref(href: string): string {
    const fragment = decodeURIComponent(href.split('#')[1] ?? '');
    const i = fragment.indexOf('_');
    return i > 0 ? `${fragment.slice(0, i)}:${fragment.slice(i + 1)}` : fragment;
}

function linkbaseArcs(xml: string, arcName: string): { from: string; to: string; arcrole: string; weight: number }[] {
    const out: { from: string; to: string; arcrole: string; weight: number }[] = [];
    // Locators are scoped per extended link; label → concept
    for (const link of xml.matchAll(/<(?:[\w-]+:)?(calculationLink|definitionLink|presentationLink)\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?\1>/g)) {
        const locs = new Map<string, string>();
        for (const m of link[2].matchAll(/<(?:[\w-]+:)?loc\b([^>]*)\/?>/g)) {
            const a = attrs(m[1]);
            locs.set(a['xlink:label'], conceptFromHref(a['xlink:href'] ?? ''));
        }
        for (const m of link[2].matchAll(new RegExp(`<(?:[\\w-]+:)?${arcName}\\b([^>]*)\\/?>`, 'g'))) {
            const a = attrs(m[1]);
            const from = locs.get(a['xlink:from']);
            const to = locs.get(a['xlink:to']);
            if (from && to) out.push({ from, to, arcrole: a['xlink:arcrole'] ?? '', weight: Number(a.weight ?? 1) });
        }
    }
    return out;
}

function readTaxonomy(files: { name: string; text: () => string }[]): Taxonomy {
    const taxonomy: Taxonomy = { children: new Map(), anchors: new Map(), labels: new Map() };
    for (const file of files) {
        const name = file.name.toLowerCase();
        if (/_cal\.xml$/.test(name)) {
            for (const arc of linkbaseArcs(file.text(), 'calculationArc')) {
                const list = taxonomy.children.get(arc.from) ?? [];
                if (!list.some(c => c.concept === arc.to)) list.push({ concept: arc.to, weight: arc.weight });
                taxonomy.children.set(arc.from, list);
            }
        } else if (/_def\.xml$/.test(name)) {
            for (const arc of linkbaseArcs(file.text(), 'definitionArc')) {
                if (!arc.arcrole.endsWith('/wider-narrower')) continue;
                // wider (IFRS) → narrower (extension)
                taxonomy.anchors.set(arc.to, [...(taxonomy.anchors.get(arc.to) ?? []), arc.from]);
            }
        } else if (/_lab(-[a-z]{2})?\.xml$/.test(name)) {
            const xml = file.text();
            for (const link of xml.matchAll(/<(?:[\w-]+:)?labelLink\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?labelLink>/g)) {
                const locs = new Map<string, string>();
                for (const m of link[1].matchAll(/<(?:[\w-]+:)?loc\b([^>]*)\/?>/g)) {
                    const a = attrs(m[1]);
                    locs.set(a['xlink:label'], conceptFromHref(a['xlink:href'] ?? ''));
                }
                const labels = new Map<string, string>();
                for (const m of link[1].matchAll(/<(?:[\w-]+:)?label\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?label>/g)) {
                    const a = attrs(m[1]);
                    if ((a['xlink:role'] ?? '').endsWith('/label')) labels.set(a['xlink:label'], stripTags(m[2]).trim());
                }
                for (const m of link[1].matchAll(/<(?:[\w-]+:)?labelArc\b([^>]*)\/?>/g)) {
                    const a = attrs(m[1]);
                    const concept = locs.get(a['xlink:from']);
                    const label = labels.get(a['xlink:to']);
                    if (concept && label && !taxonomy.labels.has(concept)) taxonomy.labels.set(concept, label);
                }
            }
        }
    }
    return taxonomy;
}

// ─── Concepts ───────────────────────────────────────────────────────────────────

const ifrs = (name: string) => `ifrs-full:${name}`;

// Borrowings, bonds, notes, loans, leases; not interest payable, trade or other payables, provisions.
const DEBT_NAME = /borrowing|loan|bond|notesanddebentures|debenture|leaseliabilit|financelease|debt|kredyt|pozycz|pożycz|obligac|leasing|weksl/i;
const NOT_DEBT_NAME = /interest(payable)?$|payable|provision|deferred|tax|trade|grant|employee|derivative|receivable|guarantee/i;
const BOND_NAME = /bond|notesanddebentures|debenture|debtinstrumentsissued|obligac/i;

// Standard IFRS debt concepts, used without a calculation tree (bare .xhtml): one per line, most
// specific first; a parent is only used when none of its parts is tagged.
const FALLBACK_DEBT: { noncurrent: string[][]; current: string[][] } = {
    noncurrent: [
        [ifrs('NoncurrentPortionOfNoncurrentBorrowings'), ifrs('LongtermBorrowings'), ifrs('NoncurrentBorrowings')],
        [ifrs('NoncurrentPortionOfNoncurrentBondsIssued'), ifrs('NoncurrentNotesAndDebenturesIssued'), ifrs('NoncurrentBondsIssued')],
        [ifrs('NoncurrentPortionOfNoncurrentLoansReceived'), ifrs('NoncurrentLoansReceived')],
        [ifrs('NoncurrentLeaseLiabilities'), ifrs('NoncurrentFinanceLeaseLiabilities')],
    ],
    current: [
        [ifrs('CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings'), ifrs('ShorttermBorrowings'), ifrs('CurrentBorrowings')],
        [ifrs('CurrentPortionOfLongtermBorrowings'), ifrs('CurrentPortionOfNoncurrentBorrowings')],
        [ifrs('CurrentBondsIssuedAndCurrentPortionOfNoncurrentBondsIssued'), ifrs('CurrentNotesAndDebenturesIssued'), ifrs('CurrentPortionOfNoncurrentBondsIssued'), ifrs('CurrentBondsIssued')],
        [ifrs('CurrentLoansReceivedAndCurrentPortionOfNoncurrentLoansReceived'), ifrs('CurrentLoansReceived')],
        [ifrs('CurrentLeaseLiabilities'), ifrs('CurrentFinanceLeaseLiabilities')],
    ],
};

// For a balance sheet in order of liquidity (financial companies): debt lines without a current or
// non-current split, directly under total liabilities.
const FALLBACK_DEBT_UNSPLIT: string[][] = [
    [ifrs('Borrowings')],
    [ifrs('BondsIssued'), ifrs('NotesAndDebenturesIssued'), ifrs('DebtInstrumentsIssued'), ifrs('DebtInstrumentsIssuedAtAmortisedCost')],
    [ifrs('LoansReceived')],
    [ifrs('LeaseLiabilities'), ifrs('FinanceLeaseLiabilities')],
];
// Last resort for such a balance sheet: some filers tag their one "credits, loans, bonds and leases"
// line with this wider concept. It may also hold other financial liabilities.
const UNSPLIT_WIDE_DEBT = ifrs('FinancialLiabilitiesAtAmortisedCost');

// ─── Entry point ────────────────────────────────────────────────────────────────

export type EsefInput = { xhtml: string; reportName: string; taxonomy?: Taxonomy };

// The report and, from a package, the filer's taxonomy files.
export function openEsef(data: Buffer, fileName = ''): EsefInput {
    if (!isZip(data)) {
        return { xhtml: data.toString('utf-8'), reportName: fileName };
    }
    const entries = readZip(data);
    const reports = entries.filter(e => /\/reports\/[^/]+\.x?html?$/i.test(`/${e.name}`) && !/ixbrlviewer/i.test(e.name));
    if (reports.length === 0) throw new UnsupportedFilingError('The zip has no report (reports/*.xhtml): not an ESEF report package');
    const report = reports.sort((a, b) => b.data().length - a.data().length)[0];
    const taxonomy = readTaxonomy(entries
        .filter(e => /\.xml$/i.test(e.name))
        .map(e => ({ name: e.name, text: () => e.data().toString('utf-8') })));
    return { xhtml: report.data().toString('utf-8'), reportName: report.name, taxonomy };
}

export function looksLikeEsef(data: Buffer): boolean {
    if (isZip(data)) return readZip(data).some(e => /\/reports\/[^/]+\.x?html?$/i.test(`/${e.name}`));
    const head = data.subarray(0, 200_000).toString('utf-8');
    return /xmlns(:[\w-]+)?="http:\/\/www\.xbrl\.org\/2013\/inlineXBRL"/.test(head);
}

function monthsBetween(start: string, end: string): number {
    const s = new Date(`${start}T00:00:00Z`);
    const e = new Date(`${end}T00:00:00Z`);
    return Math.round(((e.getTime() - s.getTime()) / 86_400_000) / 30.44);
}

export function parseEsef(input: EsefInput): ParsedFiling {
    const { xhtml, taxonomy } = input;
    const contexts = readContexts(xhtml);
    const units = readUnits(xhtml);
    const allFacts = readFacts(xhtml);
    if (contexts.size === 0 || allFacts.length === 0) {
        throw new UnsupportedFilingError('No inline XBRL facts in this report: it is not tagged (separate financial statements in ESEF often are not); use the consolidated report package');
    }

    // Facts of the reporting entity without dimensions (the statement totals), in the main currency.
    const lei = [...contexts.values()].find(c => /17442/.test(c.scheme))?.entity ?? [...contexts.values()][0].entity;
    const currencyCounts = new Map<string, number>();
    for (const f of allFacts) {
        const u = f.unit ? units.get(f.unit) : undefined;
        if (u && /^[A-Z]{3}$/.test(u)) currencyCounts.set(u, (currencyCounts.get(u) ?? 0) + 1);
    }
    const currency = [...currencyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!currency) throw new UnsupportedFilingError('No monetary facts in this report');

    const facts = allFacts.filter(f => {
        const c = contexts.get(f.context);
        return c && !c.dimensional && c.entity === lei && f.unit && units.get(f.unit) === currency;
    });

    // Fiscal years: durations of the profit or loss; the latest is the report's year.
    const durationsOf = (concept: string) => facts
        .filter(f => f.concept === concept)
        .map(f => contexts.get(f.context)!)
        .filter(c => c.start && c.end);
    const yearContexts = [...durationsOf(ifrs('ProfitLoss')), ...durationsOf(ifrs('Revenue')), ...durationsOf(ifrs('ProfitLossFromOperatingActivities'))];
    const periodKeys = [...new Set(yearContexts.map(c => `${c.start}|${c.end}`))]
        .map(k => { const [start, end] = k.split('|'); return { start, end }; })
        .filter(p => monthsBetween(p.start, p.end) >= 6)
        .sort((a, b) => b.end.localeCompare(a.end));
    if (periodKeys.length === 0) throw new UnsupportedFilingError('No annual profit or loss (ifrs-full:ProfitLoss) in this report');
    const periods = periodKeys.slice(0, 2);

    // Value of a concept for a period: durations match start and end, instants match the end.
    const value = (concept: string, p: { start: string; end: string }): number | undefined => {
        const hit = facts.find(f => {
            if (f.concept !== concept) return false;
            const c = contexts.get(f.context)!;
            return c.instant ? c.instant === p.end : c.start === p.start && c.end === p.end;
        });
        return hit?.value;
    };
    const sourced = (concepts: string[], p: { start: string; end: string }): SourcedFigure | undefined => {
        let total = 0;
        const used: string[] = [];
        for (const concept of concepts) {
            const v = value(concept, p);
            if (v !== undefined) { total += v; used.push(concept); }
        }
        return used.length ? { value: round2(total), source: used } : undefined;
    };
    const firstOf = (concepts: string[], p: { start: string; end: string }) => {
        for (const concept of concepts) {
            const f = sourced([concept], p);
            if (f) return f;
        }
        return undefined;
    };

    // Debt lines: children of the liability subtotals in the filer's calculation tree, else standard concepts.
    const label = (concept: string) => taxonomy?.labels.get(concept) ?? '';
    const isDebt = (concept: string) => {
        const anchors = taxonomy?.anchors.get(concept) ?? [];
        const names = [concept.split(':')[1] ?? concept, ...anchors.map(a => a.split(':')[1] ?? a)];
        const text = `${names.join(' ')} ${label(concept)}`;
        return DEBT_NAME.test(text) && !NOT_DEBT_NAME.test(names[0]) && !/odsetk|interest payable/i.test(label(concept));
    };
    // A line of bonds only: "credits, loans, bonds" lines can't be split.
    const isBond = (concept: string) => {
        const text = `${concept.split(':')[1] ?? concept} ${label(concept)}`;
        return BOND_NAME.test(text) && !/loan|credit|borrowing|kredyt|pożycz|pozycz/i.test(text);
    };
    // Lines under a subtotal. A non-debt subtotal (e.g. "other financial liabilities") is opened up to
    // find debt lines inside it; a debt subtotal is kept whole.
    const lines = (parent: string, depth = 0): string[] =>
        (taxonomy?.children.get(parent) ?? []).flatMap(c =>
            depth < 3 && taxonomy?.children.has(c.concept) && !isDebt(c.concept) ? lines(c.concept, depth + 1) : [c.concept]);
    // Per side (non-current, current): the calculation tree's debt lines, or the standard concepts
    // when the filer's tree doesn't cover that side. A balance sheet in order of liquidity has no
    // sides: its debt lines are taken from under total liabilities.
    const hasConcept = (concept: string) => facts.some(f => f.concept === concept);
    const unsplit = !hasConcept(ifrs('CurrentLiabilities')) && !hasConcept(ifrs('NoncurrentLiabilities'));
    const sides = unsplit
        ? [{ side: 'unsplit' as const, fromCalc: taxonomy?.children.has(ifrs('Liabilities')) ? lines(ifrs('Liabilities')).filter(isDebt) : [], fallback: FALLBACK_DEBT_UNSPLIT }]
        : (['noncurrent', 'current'] as const).map(side => {
            const parent = ifrs(side === 'noncurrent' ? 'NoncurrentLiabilities' : 'CurrentLiabilities');
            const fromCalc = taxonomy?.children.has(parent) ? lines(parent).filter(isDebt) : [];
            return { side, fromCalc, fallback: FALLBACK_DEBT[side] };
        });
    const notes: string[] = [];
    if (unsplit) notes.push('Debt: balance sheet in order of liquidity (no current and non-current liabilities), debt lines under total liabilities');

    // Without the package, a side with no standard debt concept gets the filer's own lines by their
    // name (e.g. erb:NonCurrentBorrowingsAndNonCurrentLeaseLiabilities).
    const sideOf = (local: string): 'noncurrent' | 'current' | undefined =>
        /non-?current|longterm|dlugoterm/i.test(local) ? 'noncurrent' : /current|shortterm|krotkoterm/i.test(local) ? 'current' : undefined;
    const filerConcepts = [...new Set(facts.map(f => f.concept))].filter(c => !c.startsWith('ifrs-full:'));
    let filerNamedDebtUsed = false;
    const filerDebtByName = (side: 'noncurrent' | 'current', p: { start: string; end: string }) => filerConcepts.filter(c => {
        const local = c.split(':')[1] ?? c;
        return DEBT_NAME.test(local) && !NOT_DEBT_NAME.test(local) && sideOf(local) === side && value(c, p) !== undefined;
    });

    let wideDebtUsed = false;
    const debtFor = (p: { start: string; end: string }): { all?: SourcedFigure; bonds?: SourcedFigure } => {
        const chosen = sides.flatMap(s => {
            if (s.fromCalc.length > 0) return s.fromCalc;
            const standard = s.fallback.map(g => g.find(c => value(c, p) !== undefined)).filter((c): c is string => !!c);
            if (standard.length > 0 || taxonomy || s.side === 'unsplit') return standard;
            const named = filerDebtByName(s.side, p);
            if (named.length > 0) filerNamedDebtUsed = true;
            return named;
        });
        if (chosen.length === 0 && unsplit && value(UNSPLIT_WIDE_DEBT, p) !== undefined) {
            wideDebtUsed = true;
            return { all: sourced([UNSPLIT_WIDE_DEBT], p) };
        }
        if (chosen.length === 0) return {};
        const bondLines = chosen.filter(isBond);
        return { all: sourced(chosen, p) ?? { value: 0, source: chosen }, bonds: bondLines.length ? sourced(bondLines, p) ?? { value: 0, source: bondLines } : undefined };
    };

    // Without a revenue total: its parts (IFRS revenue types and the filer's lines anchored to revenue).
    const revenueParts = [...new Set(facts.map(f => f.concept))].filter(c =>
        /^ifrs-full:RevenueFrom(?!ContractsWithCustomers$)/.test(c) && !/Interest|Dividend|Grant/.test(c)
        || (!c.startsWith('ifrs-full:') && (taxonomy?.anchors.get(c) ?? []).includes(ifrs('Revenue'))));
    // Or the filer's income total, when operating profit is income less operating expenses in the
    // calculation tree (financial companies, e.g. KRUK: interest income on debt portfolios, services, sales).
    const incomeTotal = (taxonomy?.children.get(ifrs('ProfitLossFromOperatingActivities')) ?? []).find(k => k.weight > 0
        && !k.concept.startsWith('ifrs-full:')
        && (taxonomy?.children.get(k.concept) ?? []).some(g => g.weight > 0 && /Revenue|InterestIncome|InterestRevenue/.test(g.concept)))?.concept;
    let incomeTotalUsed = false;
    const revenueFor = (p: { start: string; end: string }): SourcedFigure | undefined => {
        const total = firstOf([ifrs('Revenue'), ifrs('RevenueFromContractsWithCustomers')], p);
        if (total) return total;
        const income = incomeTotal ? sourced([incomeTotal], p) : undefined;
        if (income) { incomeTotalUsed = true; return income; }
        return sourced(revenueParts, p);
    };

    // A filer's own cash flow line for depreciation and amortisation (e.g. "depreciation, amortisation,
    // impairment and liquidation"). When it includes impairment, the tagged impairment losses are taken off.
    const filerDepreciationConcept = [...new Set(facts.map(f => f.concept))].find(c => !c.startsWith('ifrs-full:')
        && /deprec/i.test(`${c} ${label(c)}`) && /amorti[sz]/i.test(`${c} ${label(c)}`)
        && (taxonomy?.anchors.get(c) ?? []).some(a => /^ifrs-full:Adjustments/.test(a)));
    let depreciationLessImpairment = false;
    const filerDepreciation = (p: { start: string; end: string }): SourcedFigure | undefined => {
        if (!filerDepreciationConcept) return undefined;
        const line = sourced([filerDepreciationConcept], p);
        if (!line || !/impair/i.test(`${filerDepreciationConcept} ${label(filerDepreciationConcept)}`)) return line;
        const impairment = sourced([...new Set(facts.map(f => f.concept))].filter(c => /^ifrs-full:ImpairmentLossRecognisedInProfitOrLoss/.test(c)), p);
        depreciationLessImpairment = true;
        return impairment ? { value: round2(line.value - impairment.value), source: [...line.source, ...impairment.source.map(c => `−${c}`)] } : line;
    };

    const checks: string[] = [];
    const filingPeriods: FilingPeriod[] = periods.map((p, i) => {
        const debt = debtFor(p);
        const figures: FilingPeriod['figures'] = {
            revenue: revenueFor(p),
            ebit: firstOf([ifrs('ProfitLossFromOperatingActivities')], p),
            depreciation: firstOf([
                ifrs('DepreciationAndAmortisationExpense'),
                ifrs('AdjustmentsForDepreciationAndAmortisationExpense'),
                ifrs('DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss'),
                ifrs('AdjustmentsForDepreciationAndAmortisationExpenseAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss'),
            ], p) ?? sourced([ifrs('DepreciationExpense'), ifrs('AmortisationExpense')], p)
                ?? sourced([ifrs('AdjustmentsForDepreciationExpense'), ifrs('AdjustmentsForAmortisationExpense')], p)
                ?? filerDepreciation(p),
            interestExpense: firstOf([ifrs('InterestExpense'), ifrs('InterestExpenseOnBorrowings'), ifrs('FinanceCosts')], p),
            netProfit: firstOf([ifrs('ProfitLoss')], p),
            totalAssets: firstOf([ifrs('Assets')], p),
            intangibleAssets: firstOf([ifrs('IntangibleAssetsAndGoodwill')], p)
                ?? sourced([ifrs('IntangibleAssetsOtherThanGoodwill'), ifrs('Goodwill')], p),
            equity: firstOf([ifrs('Equity')], p),
            financialDebt: debt.all,
            bonds: debt.bonds,
            cash: firstOf([ifrs('CashAndCashEquivalents')], p),
            currentAssets: firstOf([ifrs('CurrentAssets')], p)
                ?? sourced([ifrs('CurrentAssetsOtherThanAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners'), ifrs('NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners'), ifrs('NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSale')].slice(0, value(ifrs('CurrentAssetsOtherThanAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners'), p) === undefined ? 0 : 3), p),
            inventory: firstOf([ifrs('Inventories'), ifrs('InventoriesTotal'), ifrs('CurrentInventoriesHeldForSale')], p),
            currentLiabilities: firstOf([ifrs('CurrentLiabilities')], p)
                ?? sourced([ifrs('CurrentLiabilitiesOtherThanLiabilitiesIncludedInDisposalGroupsClassifiedAsHeldForSale'), ifrs('LiabilitiesIncludedInDisposalGroupsClassifiedAsHeldForSale')].slice(0, value(ifrs('CurrentLiabilitiesOtherThanLiabilitiesIncludedInDisposalGroupsClassifiedAsHeldForSale'), p) === undefined ? 0 : 2), p),
            minorityInterests: firstOf([ifrs('NoncontrollingInterests')], p),
            operatingCashFlow: firstOf([ifrs('CashFlowsFromUsedInOperatingActivities')], p),
            capex: firstOf([ifrs('PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets')], p)
                ?? sourced([ifrs('PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'), ifrs('PurchaseOfIntangibleAssetsClassifiedAsInvestingActivities')], p),
        };
        for (const key of Object.keys(figures) as FilingField[]) {
            if (figures[key] === undefined) delete figures[key];
        }

        // Consistency checks (tolerance: 0.1% of total assets: tagged figures are rounded, and less is immaterial here)
        const period = i === 0 ? p.end : `${p.end} (comparative)`;
        const assets = value(ifrs('Assets'), p);
        const tolerance = Math.max(1000, Math.abs(assets ?? 0) * 0.001);
        const equityAndLiabilities = value(ifrs('EquityAndLiabilities'), p);
        if (assets !== undefined && equityAndLiabilities !== undefined && Math.abs(assets - equityAndLiabilities) > tolerance) {
            checks.push(`${period}: total assets ${fmt(assets)} ≠ total equity and liabilities ${fmt(equityAndLiabilities)}`);
        }
        const current = value(ifrs('CurrentAssets'), p);
        const noncurrent = value(ifrs('NoncurrentAssets'), p);
        // Assets held for sale may be shown outside current assets
        const heldForSale = value(ifrs('NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSaleOrAsHeldForDistributionToOwners'), p)
            ?? value(ifrs('NoncurrentAssetsOrDisposalGroupsClassifiedAsHeldForSale'), p) ?? 0;
        if (assets !== undefined && current !== undefined && noncurrent !== undefined
            && Math.abs(assets - current - noncurrent) > tolerance && Math.abs(assets - current - noncurrent - heldForSale) > tolerance) {
            checks.push(`${period}: total assets ${fmt(assets)} ≠ current ${fmt(current)} + non-current assets ${fmt(noncurrent)}`);
        }
        const equity = value(ifrs('Equity'), p);
        const liabilities = value(ifrs('Liabilities'), p);
        if (equityAndLiabilities !== undefined && equity !== undefined && liabilities !== undefined && Math.abs(equityAndLiabilities - equity - liabilities) > tolerance) {
            checks.push(`${period}: equity ${fmt(equity)} + liabilities ${fmt(liabilities)} ≠ ${fmt(equityAndLiabilities)}`);
        }
        if (assets === undefined) checks.push(`${period}: no total assets (ifrs-full:Assets) tagged`);

        return {
            column: i === 0 ? 'current' : 'previous',
            periodStart: p.start,
            periodEnd: p.end,
            months: monthsBetween(p.start, p.end),
            figures,
        };
    });

    if (filingPeriods.some(p => p.figures.interestExpense?.source[0] === ifrs('FinanceCosts'))) {
        notes.push('Interest: no interest expense tagged, finance costs used');
    }
    if (depreciationLessImpairment) {
        notes.push('Depreciation: the filer\'s combined depreciation, amortisation and impairment line, less the tagged impairment losses');
    }
    if (wideDebtUsed) {
        notes.push('Debt: one line of financial liabilities at amortised cost (credits, loans, bonds and leases together; may hold other financial liabilities), so no bond split');
    } else if (!taxonomy && filerNamedDebtUsed) {
        notes.push('Debt: report without its package; standard IFRS debt concepts, and the filer\'s own lines recognised by name where a side had none');
    } else if (!taxonomy) {
        notes.push('Debt: report without its package, standard IFRS debt concepts only (filer-specific lines are missed)');
    } else {
        for (const s of sides) if (s.fromCalc.length === 0) notes.push(`Debt: no ${s.side === 'unsplit' ? '' : `${s.side} `}borrowing lines in the calculation tree, standard IFRS concepts used`);
    }
    if (incomeTotalUsed) {
        notes.push(`Revenue: no revenue total tagged, the filer's operating income total used (${label(incomeTotal!) || incomeTotal})`);
    } else if (filingPeriods.some(p => p.figures.revenue && !p.figures.revenue.source.some(c => c === ifrs('Revenue') || c === ifrs('RevenueFromContractsWithCustomers')))) {
        notes.push('Revenue: no total tagged, sum of revenue lines');
    }

    const companyName = reportingEntityName(nonNumeric(xhtml, 'NameOfReportingEntityOrOtherMeansOfIdentification') ?? '');
    return {
        format: 'esef',
        scope: detectScope(xhtml),
        companyName,
        lei,
        currency,
        schema: `ESEF ${input.reportName.split('/').pop() ?? ''}`.trim(),
        periods: filingPeriods,
        checks,
        notes,
    };
}

// Tagged ESEF statements are consolidated by rule; a few filers tag separate statements too.
function detectScope(xhtml: string): FilingScope {
    const explicit = nonNumeric(xhtml, 'DescriptionOfNatureOfFinancialStatements') ?? '';
    const head = stripTags(xhtml.slice(0, 400_000)).slice(0, 20_000);
    const text = `${explicit} ${head}`;
    if (/skonsolidowan|consolidated/i.test(text)) return 'group';
    if (/jednostkow|separate financial statements|individual financial statements/i.test(text)) return 'single';
    return 'group';
}

const round2 = (v: number) => Math.round(v * 100) / 100;

function fmt(value: number): string {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Some filers tag a sentence: "Jednostką sporządzającą sprawozdanie finansowe jest P.A. NOVA S.A." → "P.A. NOVA S.A."
export function reportingEntityName(tagged: string): string {
    const name = tagged.replace(/\s+/g, ' ').trim();
    return name.match(/\s(?:jest|is)\s+(.+)$/i)?.[1] ?? name;
}
