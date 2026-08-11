import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env = Object.fromEntries(readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/).filter((line) => line && !line.trimStart().startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Supabase-URL oder Anon-Key fehlt.");

const tables = ["profiles", "termine", "teilnehmer", "rueckmeldungen"];
const output = {};
for (const table of tables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`${table}: Export fehlgeschlagen (${response.status}).`);
  output[table] = await response.json();
}
const target = resolve(root, "migration-data");
mkdirSync(target, { recursive: true, mode: 0o700 });
writeFileSync(resolve(target, "supabase-export.json"), JSON.stringify({ exported_at: new Date().toISOString(), tables: output }, null, 2), { mode: 0o600 });
console.log(Object.fromEntries(tables.map((table) => [table, output[table].length])));
