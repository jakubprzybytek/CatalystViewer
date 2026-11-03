// Finds who each issuer name is, in the LEI register (GLEIF), and stores it as the name's #IDENTITY row in
// IssuerProfiles. Run inside `sst shell`; a dry run unless --write:
//
//   npx sst shell --stage dev -- npm run resolve-issuers [-- --write] [-- --only "<text>"] [-- --redo]
//
// Names: the issuers of active bonds and those with a profile. Each without an identity (all with
// --redo) is looked up by its bonds' ISINs, then by an exact name match; a match whose legal name differs
// from the bond name is stored for review. For a foreign or reviewed match the direct parent is
// looked up too, and suggested as the source of figures when the parent has imported reports.
//
// One name at a time (with --write to store):
//   --name "<issuer>" --lei <lei> | --krs <number>        set its company by hand
//   --name "<issuer>" --financials-from <entityId|parent>  use another company's reports (a financing vehicle)
//   --name "<issuer>" --confirm                            confirm a match under review
//
// GLEIF is asked about once a second; a full run is a few hundred requests.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import { BondDetailsTable } from "../../packages/core/src/storage/bondDetails";
import { IssuerProfilesTable, type DbIssuerIdentityRecord } from "../../packages/core/src/storage/issuerProfiles";
import { IssuerFinancialsTable } from "../../packages/core/src/storage/issuerFinancials";
import { entityIdOf, gleifClient, identityRecord, namesAgree, resolveIssuer, type LeiEntity } from "../../packages/core/src/bonds/issuers/identity";

const REGION = "eu-west-1";

function arg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function describe(i: DbIssuerIdentityRecord): string {
  const register = i.krs ? `KRS ${i.krs}` : i.register ? `${i.register.authority} ${i.register.id}` : "no register number";
  const financials = i.financialsEntityId !== i.entityId ? ` · figures from ${i.financialsEntityId}` : "";
  return `${i.legalName} · ${i.country} · ${register} · LEI ${i.lei}${i.leiStatus && i.leiStatus !== "ISSUED" ? ` (${i.leiStatus})` : ""}${financials}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const redo = argv.includes("--redo");
  const only = arg(argv, "--only")?.toLowerCase();
  const name = arg(argv, "--name");

  let tables: { profiles: string; bonds: string; financials: string };
  try {
    tables = { profiles: Resource.IssuerProfiles.name, bonds: Resource.BondDetails.name, financials: Resource.IssuerFinancials.name };
  } catch {
    throw new Error("Run inside `sst shell --stage <stage>`");
  }
  const dynamo = new DynamoDBClient({ region: REGION });
  const profiles = new IssuerProfilesTable(dynamo, tables.profiles);
  const gleif = gleifClient();
  const now = new Date();
  const store = async (record: DbIssuerIdentityRecord) => {
    console.log(`${write ? "stored" : "would store"}: ${record.issuerName} → ${describe(record)} [${record.status}, ${record.evidence}]`);
    if (write) await profiles.storeIdentity(record);
  };

  // ─── One name by hand ───
  if (name) {
    const existing = await profiles.getIdentity(name);
    const lei = arg(argv, "--lei");
    const krs = arg(argv, "--krs");
    const from = arg(argv, "--financials-from");
    if (lei || krs) {
      const entity: LeiEntity | undefined = lei ? await gleif.byLei(lei) : await gleif.byKrs(krs!.padStart(10, "0"));
      if (!entity) throw new Error(`No LEI record for ${lei ? `LEI ${lei}` : `KRS ${krs}`}`);
      const parentLei = await gleif.directParent(entity.lei);
      await store(identityRecord(name, entity, { source: "manual", evidence: "set by hand", status: "confirmed", parentLei }, now));
    } else if (from) {
      if (!existing) throw new Error(`"${name}" has no identity yet`);
      let financialsEntityId = from;
      if (from === "parent") {
        if (!existing.parentLei) throw new Error(`The LEI register reports no parent for ${existing.legalName}`);
        const parent = await gleif.byLei(existing.parentLei);
        if (!parent) throw new Error(`No LEI record for the parent ${existing.parentLei}`);
        financialsEntityId = entityIdOf(parent).entityId;
      }
      await store({ ...existing, financialsEntityId, resolvedAt: now.toISOString() });
    } else if (argv.includes("--confirm")) {
      if (!existing) throw new Error(`"${name}" has no identity yet`);
      const { note: _note, ...rest } = existing;
      await store({ ...rest, status: "confirmed", evidence: `${existing.evidence}, confirmed by hand`, resolvedAt: now.toISOString() });
    } else {
      console.log(existing ? `${name} → ${describe(existing)} [${existing.status}, ${existing.evidence}]` : `${name}: no identity`);
    }
    return;
  }

  // ─── Every name ───
  const [bonds, profileRows, identities, financials] = await Promise.all([
    new BondDetailsTable(dynamo, tables.bonds).getAllActive(),
    profiles.getProfiles(),
    profiles.getIdentities(),
    new IssuerFinancialsTable(dynamo, tables.financials).getAll(),
  ]);
  const isins = new Map<string, string[]>();
  for (const b of bonds) {
    const list = isins.get(b.issuer) ?? [];
    if (b.isin && !list.includes(b.isin)) list.push(b.isin);
    isins.set(b.issuer, list);
  }
  for (const p of profileRows) if (!isins.has(p.issuerName)) isins.set(p.issuerName, []);
  const known = new Map(identities.map(i => [i.issuerName, i]));
  const withReports = new Set(financials.map(f => f.entityId));
  const names = [...isins.keys()].sort()
    .filter(n => !only || n.toLowerCase().includes(only))
    .filter(n => redo || !known.has(n));
  console.log(`${names.length} issuer name(s) to resolve (${known.size} already have an identity)${write ? "" : "; dry run"}`);

  const unresolved: string[] = [];
  const review: string[] = [];
  const made: DbIssuerIdentityRecord[] = [];
  for (const n of names) {
    const r = await resolveIssuer(n, isins.get(n) ?? [], gleif);
    if (!r.found) {
      console.log(`✗ ${n}: ${r.reason}`);
      unresolved.push(n);
      continue;
    }
    // A foreign or reviewed match may be a financing vehicle: its parent, when the register has one
    const parentLei = r.entity.jurisdiction !== "PL" || r.status === "review" ? await gleif.directParent(r.entity.lei) : undefined;
    // The bond name is the parent's (the bonds are issued by its financing vehicle): its figures are the parent's
    const parent = parentLei ? await gleif.byLei(parentLei) : undefined;
    const parentId = parent && entityIdOf(parent).entityId;
    const nameIsParents = !!parent && r.status === "review" && namesAgree(n, parent);
    const note = nameIsParents ? `issued by ${r.entity.legalName}, a vehicle of ${parent!.legalName}, whose figures are used` : r.note;
    const record = identityRecord(n, r.entity, { source: r.source, evidence: r.evidence, status: r.status, note, parentLei, ...(nameIsParents ? { financialsEntityId: parentId } : {}) }, now);
    await store(record);
    made.push(record);
    if (r.status === "review") review.push(`${n}: ${note}`);
    if (parent && parentId && !nameIsParents && withReports.has(parentId)) {
      console.log(`    parent ${parent.legalName} (${parentId}) has imported reports: --name "${n}" --financials-from parent`);
    }
  }

  // Names that are one company
  const all = [...identities.filter(i => !names.includes(i.issuerName)), ...made];
  const shared = [...Map.groupBy(all, i => i.entityId).values()].filter(g => g.length > 1);
  console.log(`\n${names.length - unresolved.length} resolved, ${review.length} for review, ${unresolved.length} unresolved`);
  if (review.length) console.log(`\nFor review (--name "<issuer>" --confirm, or --lei/--krs to correct):\n  ${review.join("\n  ")}`);
  if (unresolved.length) console.log(`\nUnresolved (--name "<issuer>" --lei <lei> or --krs <number>):\n  ${unresolved.join("\n  ")}`);
  if (shared.length) console.log(`\nOne company under several names:\n  ${shared.map(g => `${g[0].legalName}: ${g.map(i => i.issuerName).join(", ")}`).join("\n  ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
