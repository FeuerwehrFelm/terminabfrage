import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const envFile = resolve(import.meta.dirname, "..", ".env.goneo.local");
const env = Object.fromEntries(readFileSync(envFile, "utf8").split(/\r?\n/).filter((line) => line && !line.trimStart().startsWith("#") && line.includes("=")).map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
const required = ["GONEO_FTPS_HOST", "GONEO_FTPS_PORT", "GONEO_FTPS_USER", "GONEO_FTPS_PASSWORD"];
for (const key of required) if (!env[key]) throw new Error(`Fehlender Wert: ${key}`);
const port = Number(env.GONEO_FTPS_PORT);
const scheme = port === 990 ? "ftps" : "ftp";
const paths = ["/", env.GONEO_FTPS_TARGET_PATH || "/"].filter((value, index, all) => all.indexOf(value) === index);
for (const path of paths) {
  const normalized = `/${path.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");
  console.log(`FTPS-Verzeichnis: ${normalized}`);
  const result = spawnSync("curl", ["--silent", "--show-error", "--fail", "--connect-timeout", "10", "--max-time", "20", "--ftp-ssl-reqd", "--disable-epsv", "--user", `${env.GONEO_FTPS_USER}:${env.GONEO_FTPS_PASSWORD}`, "--list-only", `${scheme}://${env.GONEO_FTPS_HOST}:${port}${normalized}`], { encoding: "utf8" });
  if (result.status !== 0) throw new Error((result.stderr || `FTPS-Prüfung fehlgeschlagen (Status ${result.status}, Signal ${result.signal || "-"}).`).replaceAll(env.GONEO_FTPS_PASSWORD, "[REDACTED]"));
  console.log(result.stdout.trim() || "(leer)");
}
