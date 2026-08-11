import { randomBytes } from "node:crypto";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(import.meta.dirname, "..", ".env.goneo.local");
let source = readFileSync(file, "utf8");
source = source.replace(/^GONEO_FTPS_PORT=22$/m, "GONEO_FTPS_PORT=21");
source = source.replace(/^GONEO_FTPS_PORT=21$/m, "GONEO_FTPS_PORT=990");
source = source.replace(/^GONEO_FTPS_TARGET_PATH=\/htdocs\/termine$/m, "GONEO_FTPS_TARGET_PATH=/");
const defaults = {
  GONEO_TEILNAHME_ACCESS_CODE: randomBytes(18).toString("base64url"),
  GONEO_API_ADMIN_SECRET: randomBytes(32).toString("base64url"),
  GONEO_API_SESSION_SECRET: randomBytes(32).toString("base64url"),
};
for (const [key, value] of Object.entries(defaults)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (!pattern.test(source)) source += `\n${key}=${value}`;
  else if (new RegExp(`^${key}=$`, "m").test(source)) source = source.replace(pattern, `${key}=${value}`);
}
for (const key of ["GONEO_INITIAL_ADMIN_EMAIL", "GONEO_INITIAL_ADMIN_PASSWORD"]) {
  if (!new RegExp(`^${key}=`, "m").test(source)) source += `\n${key}=`;
}
writeFileSync(file, source.replace(/\n{3,}/g, "\n\n").replace(/\n?$/, "\n"), { mode: 0o600 });
chmodSync(file, 0o600);
console.log("Fehlende goneo-Schlüssel wurden lokal erzeugt.");
