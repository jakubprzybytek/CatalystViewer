// Imports a filed annual statement: parses it, matches it to one of the app's issuers, checks the company
// against the court register (KRS) or the LEI register (GLEIF), stores the original file in S3 and one row
// per fiscal year in IssuerFinancials. Formats (detected from the file):
//   - KRS XML: Polish accounting act statements from the KRS financial documents browser (FilingParser)
//   - ESEF: IFRS report package (.zip) or inline XBRL report (.xhtml), as listed companies publish (EsefParser)
//   - IFRS text: an untagged IFRS statement as XHTML/HTML, read by line labels (IfrsTextParser)
//   - PDF: read by a model and verified in code (AiPdfExtractor); needs `transcribe`
// Used by `npm run import-filing` (scripts/import-filing); kept here so a web upload can reuse it.
import { createHash } from 'crypto';
import axios from 'axios';
import { PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { DbIssuerFinancialsRecord, IssuerFinancialsTable } from '../../../storage/issuerFinancials';
import { parseFiling, type ParsedFiling } from './FilingParser';
import { looksLikeEsef, openEsef, parseEsef } from './EsefParser';
import { parseIfrsText } from './IfrsTextParser';
import { isZip } from './zip';
import { isPdf, readPdfPages } from './pdfText';
import { extractStatements, findKrs, findLei, type Transcriber } from './AiPdfExtractor';

export type LeiRecord = { legalName: string; krs?: string; registeredAs?: string; jurisdiction?: string };

export type ImportFilingDeps = {
    issuerNames: string[];                       // the app's issuers (IssuerProfiles)
    financialsTable: IssuerFinancialsTable;
    s3: S3Client;
    bucket: string;
    registerName?: (krs: string) => Promise<string | undefined>;  // default: the KRS register API
    leiRecord?: (lei: string) => Promise<LeiRecord | undefined>;   // default: the GLEIF API
    transcribe?: Transcriber;                    // model for PDFs (AiPdfExtractor.bedrockTranscriber)
    now?: () => Date;
};

export type ImportFilingOptions = {
    issuerName?: string;   // skip name matching
    krs?: string;          // the company's KRS number, when the filing doesn't give one
    fileName?: string;     // helps tell formats apart
    dryRun?: boolean;      // everything but the writes
    force?: boolean;       // store although the filing's consistency checks failed
};

export type ImportFilingResult = {
    filing: ParsedFiling;
    issuerName: string;
    entityId: string;
    krs?: string;
    lei?: string;
    s3Key: string;
    stored: { periodEnd: string; column: 'current' | 'previous'; written: boolean }[];
    warnings: string[];
};

export class ImportFilingError extends Error {}

// ─── Formats ────────────────────────────────────────────────────────────────────

type FileKind = { extension: 'xml' | 'zip' | 'xhtml' | 'pdf'; contentType: string };

// ESEF (zip or inline XBRL), then an HTML document (untagged IFRS), then the KRS XML structures.
export function readFiling(data: Buffer, fileName = ''): { filing: ParsedFiling; kind: FileKind } {
    if (looksLikeEsef(data)) {
        const zip = isZip(data);
        return {
            filing: parseEsef(openEsef(data, fileName)),
            kind: zip ? { extension: 'zip', contentType: 'application/zip' } : { extension: 'xhtml', contentType: 'application/xhtml+xml' },
        };
    }
    if (isZip(data)) throw new ImportFilingError('A zip that is not an ESEF report package (no reports/*.xhtml)');
    const head = data.subarray(0, 20_000).toString('utf-8');
    if (/<html[\s>]/i.test(head) || /\.x?html?$/i.test(fileName)) {
        return { filing: parseIfrsText(data.toString('utf-8')), kind: { extension: 'xhtml', contentType: 'application/xhtml+xml' } };
    }
    return { filing: parseFiling(data.toString('utf-8')), kind: { extension: 'xml', contentType: 'application/xml' } };
}

// Any supported file; a PDF goes to the model. With `requireIdentity`, a PDF that names no KRS number
// or LEI (and no `krs` given) is refused before the paid model call.
export async function readAnyFiling(
    data: Buffer, fileName = '', transcribe?: Transcriber, opts: { requireIdentity?: boolean; krs?: string } = {},
): Promise<{ filing: ParsedFiling; kind: FileKind }> {
    if (!isPdf(data)) return readFiling(data, fileName);
    if (!transcribe) throw new ImportFilingError('A PDF is read by a model: no model configured');
    const pages = await readPdfPages(data);
    if (opts.requireIdentity && !opts.krs && !findKrs(pages) && !findLei(pages)) {
        throw new ImportFilingError('The PDF names no KRS number or LEI; pass --krs <number>');
    }
    return { filing: await extractStatements(pages, transcribe), kind: { extension: 'pdf', contentType: 'application/pdf' } };
}

// ─── Names ──────────────────────────────────────────────────────────────────────

const LEGAL_FORMS: [RegExp, string][] = [
    [/PROSTA SPOLKA AKCYJNA/g, ''],
    [/SPOLKA Z OGRANICZONA ODPOWIEDZIALNOSCIA/g, ''],
    [/SPOLKA KOMANDYTOWO AKCYJNA/g, ''],
    [/SPOLKA KOMANDYTOWA/g, ''],
    [/SPOLKA AKCYJNA/g, ''],
    [/\bSP Z O ?O\b/g, ''],
    [/\bS ?K ?A\b/g, ''],
    [/\bSP ?K\b/g, ''],
    [/\bP ?S ?A\b/g, ''],
    [/\bS ?A\b/g, ''],
    [/\bW (UPADLOSCI|RESTRUKTURYZACJI|LIKWIDACJI)\b/g, ''],
    [/^GRUPA KAPITALOWA /g, ''],
];

// "Dadelo S.A." and "DADELO SPÓŁKA AKCYJNA" → "DADELO"
export function normalizeCompanyName(name: string): string {
    let n = name
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .replace(/ł/g, 'l').replace(/Ł/g, 'L')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, ' ')
        .trim();
    for (const [pattern, replacement] of LEGAL_FORMS) n = n.replace(pattern, replacement);
    return n.replace(/\s+/g, ' ').trim();
}

// ─── Registers ──────────────────────────────────────────────────────────────────

async function krsRegisterName(krs: string): Promise<string | undefined> {
    const url = `https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/${krs}?rejestr=P&format=json`;
    const response = await axios.get(url, { timeout: 15000, validateStatus: s => s === 200 || s === 404 });
    return response.status === 200 ? response.data?.odpis?.dane?.dzial1?.danePodmiotu?.nazwa : undefined;
}

// GLEIF registration authority RA000484 is the Polish National Court Register (KRS).
const KRS_AUTHORITY = 'RA000484';

async function gleifRecord(lei: string): Promise<LeiRecord | undefined> {
    const response = await axios.get(`https://api.gleif.org/api/v1/lei-records/${lei}`, { timeout: 15000, validateStatus: s => s === 200 || s === 404 });
    const entity = response.status === 200 ? response.data?.data?.attributes?.entity : undefined;
    if (!entity) return undefined;
    const registeredAs: string | undefined = entity.registeredAs ?? undefined;
    const isKrs = entity.registeredAt?.id === KRS_AUTHORITY && registeredAs && /^\d{1,10}$/.test(registeredAs);
    return {
        legalName: entity.legalName?.name ?? '',
        registeredAs,
        jurisdiction: entity.jurisdiction,
        krs: isKrs ? registeredAs!.padStart(10, '0') : undefined,
    };
}

type Identity = { entityId: string; krs?: string; lei?: string; names: string[] };

async function identify(filing: ParsedFiling, deps: ImportFilingDeps, options: ImportFilingOptions, warnings: string[]): Promise<Identity> {
    const names = [filing.companyName].filter(Boolean);
    let krs = options.krs ?? filing.krs;
    if (options.krs && filing.krs && options.krs !== filing.krs) {
        throw new ImportFilingError(`--krs ${options.krs} doesn't match the filing's KRS number ${filing.krs}`);
    }
    if (krs && !/^\d{10}$/.test(krs)) throw new ImportFilingError(`"${krs}" isn't a KRS number (10 digits)`);

    // ESEF: the LEI register gives the legal name and, for Polish companies, the KRS number.
    if (filing.lei) {
        try {
            const record = await (deps.leiRecord ?? gleifRecord)(filing.lei);
            if (!record) {
                warnings.push(`LEI ${filing.lei} isn't in the LEI register (GLEIF)`);
            } else {
                names.push(record.legalName);
                if (record.krs && krs && record.krs !== krs) {
                    throw new ImportFilingError(`LEI ${filing.lei} is registered under KRS ${record.krs}, not ${krs}`);
                }
                krs ??= record.krs;
                if (!record.krs) {
                    const where = [record.jurisdiction, record.registeredAs].filter(Boolean).join(' ') || 'unknown register';
                    warnings.push(`LEI ${filing.lei} (${record.legalName}) isn't registered in the KRS (${where}): stored under its LEI`);
                }
            }
        } catch (error) {
            if (error instanceof ImportFilingError) throw error;
            warnings.push(`Couldn't check LEI ${filing.lei} in the LEI register: ${error instanceof Error ? error.message : error}`);
        }
    }
    if (!krs && !filing.lei) {
        throw new ImportFilingError('The filing has no KRS number; pass --krs <number>');
    }

    // The court register: does this KRS number belong to the company named in the filing?
    if (krs) {
        try {
            const registered = await (deps.registerName ?? krsRegisterName)(krs);
            if (!registered) {
                warnings.push(`KRS ${krs} isn't in the court register (business register, rejestr P)`);
            } else {
                if (!names.some(n => normalizeCompanyName(n) === normalizeCompanyName(registered))) {
                    warnings.push(`KRS ${krs} is registered as "${registered}", the filing says "${filing.companyName}" (renamed?)`);
                }
                names.push(registered);
            }
        } catch (error) {
            warnings.push(`Couldn't check KRS ${krs} in the court register: ${error instanceof Error ? error.message : error}`);
        }
    }
    return { entityId: krs ?? `LEI:${filing.lei}`, krs, lei: filing.lei, names };
}

function resolveIssuer(identity: Identity, deps: ImportFilingDeps, known: DbIssuerFinancialsRecord[], requested?: string): string {
    if (requested) {
        if (!deps.issuerNames.includes(requested)) {
            const close = deps.issuerNames.filter(n => normalizeCompanyName(n).includes(normalizeCompanyName(requested).split(' ')[0] ?? ''));
            throw new ImportFilingError(`No issuer "${requested}" in the app${close.length ? `; did you mean: ${close.slice(0, 5).join(', ')}` : ''}`);
        }
        return requested;
    }
    // Imported before under this company
    const previous = known.find(r => r.entityId === identity.entityId);
    if (previous) return previous.issuerName;

    const targets = new Set(identity.names.map(normalizeCompanyName).filter(Boolean));
    const matches = deps.issuerNames.filter(n => targets.has(normalizeCompanyName(n)));
    if (matches.length === 1) return matches[0];
    const hint = matches.length > 1 ? `several issuers match: ${matches.join(', ')}` : `no issuer named like "${identity.names.join('" or "')}"`;
    throw new ImportFilingError(`Can't tell which issuer this filing belongs to (${hint}); pass --issuer "<issuer name as in the app>"`);
}

// ─── Entry point ────────────────────────────────────────────────────────────────

export async function importFiling(deps: ImportFilingDeps, data: Buffer, options: ImportFilingOptions = {}): Promise<ImportFilingResult> {
    const { filing, kind } = await readAnyFiling(data, options.fileName, deps.transcribe, { requireIdentity: true, krs: options.krs });
    const warnings: string[] = [];

    if (filing.checks.length > 0 && !options.force) {
        throw new ImportFilingError(`The filing doesn't add up:\n  ${filing.checks.join('\n  ')}\nCheck it, then pass --force to store it anyway`);
    }
    warnings.push(...filing.checks);

    const identity = await identify(filing, deps, options, warnings);
    const all = await deps.financialsTable.getAll();
    const issuerName = resolveIssuer(identity, deps, all, options.issuerName);

    // One issuer, one company: another one is most likely the wrong file.
    const other = all.find(r => r.issuerName === issuerName && r.entityId !== identity.entityId);
    if (other && !options.force) {
        throw new ImportFilingError(`${issuerName} already has filings of ${other.entityId} (${other.companyName}); this one is ${identity.entityId}. Pass --force if both are right`);
    }

    for (const p of filing.periods) {
        if (p.months !== 12) warnings.push(`${p.periodStart}–${p.periodEnd} is ${p.months} months, not a full year: stored, left out of the scorecard`);
    }

    const sha256 = createHash('sha256').update(data).digest('hex');
    const s3Key = `filings/${identity.entityId.replace(':', '-')}/${filing.periods[0].periodEnd}-${filing.scope}-${sha256.slice(0, 12)}.${kind.extension}`;
    const importedAt = (deps.now ?? (() => new Date()))().toISOString();

    const records: DbIssuerFinancialsRecord[] = filing.periods.map(p => ({
        entityId: identity.entityId,
        krs: identity.krs,
        lei: identity.lei,
        period: `${p.periodEnd}#${filing.scope}`,
        issuerName,
        companyName: filing.companyName || identity.names[1] || '',
        scope: filing.scope,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        months: p.months,
        currency: filing.currency,
        figures: p.figures,
        column: p.column,
        filing: { key: s3Key, sha256, format: filing.format, schema: filing.schema, preparedOn: filing.preparedOn, checks: filing.checks, notes: filing.notes, extraction: filing.extraction },
        importedAt,
    }));

    const result = { filing, issuerName, entityId: identity.entityId, krs: identity.krs, lei: identity.lei, s3Key, warnings };
    if (options.dryRun) {
        return { ...result, stored: records.map(r => ({ periodEnd: r.periodEnd, column: r.column, written: false })) };
    }

    await deps.s3.send(new PutObjectCommand({ Bucket: deps.bucket, Key: s3Key, Body: data, ContentType: kind.contentType }));
    const stored = [];
    for (const record of records) {
        stored.push({ periodEnd: record.periodEnd, column: record.column, written: await deps.financialsTable.store(record) });
    }
    return { ...result, stored };
}
