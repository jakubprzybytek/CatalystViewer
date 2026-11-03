// Who an issuer name is: the company behind the bonds listed under that name, from the LEI register
// (GLEIF, open data). Every issuer of listed securities has an LEI. Two ways in:
//   1. ISIN → LEI: GLEIF's ISIN mapping, for the issuer's bonds;
//   2. name search: accepted only when exactly one LEI record has the same name, legal forms aside.
// A match whose legal name doesn't agree with the issuer name (a rename, a merger, a financing vehicle,
// or a wrong mapping) is kept for review rather than confirmed.
import { normalizeCompanyName } from '../fundamentals/filings/importFiling';
import type { DbIssuerIdentityRecord } from '../../storage/issuerProfiles';

export type LeiEntity = {
    lei: string;
    legalName: string;
    otherNames: string[];
    jurisdiction: string;
    registeredAt?: string;      // GLEIF registration authority, RA000484 = the Polish KRS
    registeredAs?: string;
    category?: string;
    status: string;             // ISSUED, LAPSED, RETIRED, …
};

export type Gleif = {
    byIsin(isin: string): Promise<LeiEntity | undefined>;
    search(text: string): Promise<LeiEntity[]>;
    byLei(lei: string): Promise<LeiEntity | undefined>;
    byKrs(krs: string): Promise<LeiEntity | undefined>;
    directParent(lei: string): Promise<string | undefined>;
};

const KRS_AUTHORITY = 'RA000484';
const API = 'https://api.gleif.org/api/v1';

type GleifRecord = { id: string; attributes: { entity: Record<string, any>; registration: { status: string } } };

function toEntity(r: GleifRecord): LeiEntity {
    const e = r.attributes.entity;
    return {
        lei: r.id,
        legalName: e.legalName?.name ?? '',
        otherNames: (e.otherNames ?? []).map((n: { name: string }) => n.name),
        jurisdiction: e.jurisdiction ?? '',
        registeredAt: e.registeredAt?.id ?? undefined,
        registeredAs: e.registeredAs ?? undefined,
        category: e.category ?? undefined,
        status: r.attributes.registration.status,
    };
}

// GLEIF's public API, at most one request per `intervalMs` (its limit is 60 a minute).
export function gleifClient(fetchJson: (url: string) => Promise<any> = defaultFetch, intervalMs = 1100): Gleif {
    let last = 0;
    const get = async (path: string, params: Record<string, string> = {}) => {
        const wait = last + intervalMs - Date.now();
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        last = Date.now();
        const query = new URLSearchParams(params).toString();
        return fetchJson(`${API}${path}${query ? `?${query}` : ''}`);
    };
    const list = async (params: Record<string, string>) => ((await get('/lei-records', params))?.data ?? []).map(toEntity) as LeiEntity[];
    return {
        byIsin: async isin => (await list({ 'filter[isin]': isin }))[0],
        search: text => list({ 'filter[fulltext]': text, 'page[size]': '10' }),
        byLei: async lei => { const r = await get(`/lei-records/${lei}`); return r?.data ? toEntity(r.data) : undefined; },
        // The API filters by the local number only; the KRS is checked here.
        byKrs: async krs => (await list({ 'filter[entity.registeredAs]': krs })).find(e => e.registeredAt === KRS_AUTHORITY),
        directParent: async lei => (await get(`/lei-records/${lei}/direct-parent`))?.data?.id,
    };
}

async function defaultFetch(url: string): Promise<any> {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } });
    if (response.status === 404) return undefined;
    if (!response.ok) throw new Error(`GLEIF ${response.status} for ${url}`);
    return response.json();
}

// ─── Names ──────────────────────────────────────────────────────────────────────

// Municipal and other public-body forms that differ between the bond listing and the register
// ("Miasto Łódź" = "ŁÓDŹ-MIASTO NA PRAWACH POWIATU", "Gmina Miasta Sopot" = "GMINA MIASTA SOPOTU").
const PUBLIC_FORMS = /\b(GMINA|GMINY|MIEJSKA|MIASTO|MIASTA|NA PRAWACH POWIATU|WOJEWODZTWO|POWIAT)\b/g;

// "Dino Polska S.A." and "\"DINO POLSKA\" SPÓŁKA AKCYJNA" → "DINO POLSKA"; former names in brackets dropped.
export function identityName(name: string): string {
    const base = normalizeCompanyName(name.replace(/\(.*?\)/g, ' '));
    const n = base.replace(/\b(AB|PUBL|ASI|S A R L|SARL|FIZAN|FIZ)\b/g, ' ').replace(PUBLIC_FORMS, ' ').replace(/\s+/g, ' ').trim();
    // A form that is the whole name ("AB S.A.") stays. City names in the genitive ("Sopotu") go to review.
    return n || base;
}

export function namesAgree(issuerName: string, entity: LeiEntity): boolean {
    const a = identityName(issuerName);
    return a !== '' && [entity.legalName, ...entity.otherNames].some(n => {
        const b = identityName(n);
        return b !== '' && (a === b || ` ${b} `.includes(` ${a} `) || ` ${a} `.includes(` ${b} `));
    });
}

// The name to search with: no former names, no trailing legal form (GLEIF's text search misses "S.A.").
export function searchText(issuerName: string): string {
    return issuerName.replace(/\(.*?\)/g, ' ')
        .replace(/\s+(S\.A\.|SA|S\.à r\.l\.|Sp\. z o\.o\.|SE|ASI|N\.V\.|NV|PLC|AB \(publ\)|AB)\s*$/i, '')
        .replace(/\s+/g, ' ').trim();
}

// ─── Resolution ─────────────────────────────────────────────────────────────────

export type Resolution =
    | { found: true; entity: LeiEntity; source: 'isin' | 'name'; evidence: string; status: 'confirmed' | 'review'; note?: string }
    | { found: false; reason: string };

export async function resolveIssuer(issuerName: string, isins: string[], gleif: Gleif, maxIsins = 3): Promise<Resolution> {
    for (const isin of isins.slice(0, maxIsins)) {
        const entity = await gleif.byIsin(isin);
        if (!entity) continue;
        const agree = namesAgree(issuerName, entity);
        return {
            found: true, entity, source: 'isin', evidence: `ISIN ${isin}`,
            status: agree ? 'confirmed' : 'review',
            ...(agree ? {} : { note: `the LEI register names it "${entity.legalName}"` }),
        };
    }
    const same = (await gleif.search(searchText(issuerName))).filter(e => identityName(e.legalName) === identityName(issuerName));
    if (same.length === 1) return { found: true, entity: same[0], source: 'name', evidence: 'name match', status: 'confirmed' };
    if (same.length > 1) return { found: false, reason: `several LEI records with this name: ${same.map(e => `${e.lei} (${e.status})`).join(', ')}` };
    return { found: false, reason: `no LEI for its ISINs${isins.length ? '' : ' (none known)'}, and no LEI record with this name` };
}

// The company's id as IssuerFinancials keys it: the KRS number for a Polish company, else LEI:<lei>.
export function entityIdOf(entity: LeiEntity): { entityId: string; krs?: string } {
    const krs = entity.registeredAt === KRS_AUTHORITY && entity.registeredAs && /^\d{1,10}$/.test(entity.registeredAs)
        ? entity.registeredAs.padStart(10, '0') : undefined;
    return krs ? { entityId: krs, krs } : { entityId: `LEI:${entity.lei}` };
}

export function identityRecord(
    issuerName: string,
    entity: LeiEntity,
    how: { source: DbIssuerIdentityRecord['source']; evidence: string; status: DbIssuerIdentityRecord['status']; note?: string; parentLei?: string; financialsEntityId?: string },
    now: Date,
): DbIssuerIdentityRecord {
    const { entityId, krs } = entityIdOf(entity);
    return {
        issuerName,
        recordType: '#IDENTITY',
        entityId,
        lei: entity.lei,
        ...(krs ? { krs } : {}),
        legalName: entity.legalName,
        country: entity.jurisdiction.slice(0, 2).toUpperCase(),
        ...(entity.registeredAt && entity.registeredAs ? { register: { authority: entity.registeredAt, id: entity.registeredAs } } : {}),
        ...(entity.category ? { category: entity.category } : {}),
        leiStatus: entity.status,
        ...(how.parentLei ? { parentLei: how.parentLei } : {}),
        financialsEntityId: how.financialsEntityId ?? entityId,
        status: how.status,
        source: how.source,
        evidence: how.evidence,
        ...(how.note ? { note: how.note } : {}),
        resolvedAt: now.toISOString(),
    };
}

// Names that are one company (their identities share an entity), keyed by entity.
export function companies(identities: DbIssuerIdentityRecord[]): Map<string, DbIssuerIdentityRecord[]> {
    return Map.groupBy(identities, i => i.entityId);
}

// An issuer's imported reports: those of the company whose figures it uses (its identity), else, for a
// name without an identity, those stored under that name.
export function reportsOf<T extends { entityId: string; issuerName: string }>(issuerName: string, identity: DbIssuerIdentityRecord | undefined, rows: T[]): T[] {
    return identity ? rows.filter(r => r.entityId === identity.financialsEntityId) : rows.filter(r => r.issuerName === issuerName);
}

export type IdentityOutcome =
    | { found: true; record: DbIssuerIdentityRecord; parent?: { legalName: string; entityId: string } }
    | { found: false; reason: string };

// One issuer name: its company, and for a foreign or reviewed match the direct parent. When the bond
// name is the parent's (its bonds are issued by the parent's financing vehicle), the parent's figures are used.
export async function resolveIdentity(issuerName: string, isins: string[], gleif: Gleif, now: Date): Promise<IdentityOutcome> {
    const r = await resolveIssuer(issuerName, isins, gleif);
    if (!r.found) return r;
    const parentLei = r.entity.jurisdiction !== 'PL' || r.status === 'review' ? await gleif.directParent(r.entity.lei) : undefined;
    const parentEntity = parentLei ? await gleif.byLei(parentLei) : undefined;
    const parent = parentEntity ? { legalName: parentEntity.legalName, entityId: entityIdOf(parentEntity).entityId } : undefined;
    const nameIsParents = !!parentEntity && r.status === 'review' && namesAgree(issuerName, parentEntity);
    const note = nameIsParents ? `issued by ${r.entity.legalName}, a vehicle of ${parentEntity!.legalName}, whose figures are used` : r.note;
    const record = identityRecord(issuerName, r.entity, {
        source: r.source, evidence: r.evidence, status: r.status, note, parentLei,
        ...(nameIsParents ? { financialsEntityId: parent!.entityId } : {}),
    }, now);
    return { found: true, record, ...(parent ? { parent } : {}) };
}
