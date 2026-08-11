import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(readFileSync(resolve(root, "migration-data", "supabase-export.json"), "utf8"));
const tables = source.tables || {};
for (const name of ["termine", "teilnehmer", "rueckmeldungen"]) {
  if (!Array.isArray(tables[name])) throw new Error(`Exporttabelle fehlt: ${name}`);
}
const target = resolve(root, "goneo-api", "migration-data.json");
writeFileSync(target, JSON.stringify({ exported_at: source.exported_at, tables: { termine: tables.termine, teilnehmer: tables.teilnehmer, rueckmeldungen: tables.rueckmeldungen } }), { mode: 0o600 });
chmodSync(target, 0o600);
console.log({ termine: tables.termine.length, teilnehmer: tables.teilnehmer.length, rueckmeldungen: tables.rueckmeldungen.length });
