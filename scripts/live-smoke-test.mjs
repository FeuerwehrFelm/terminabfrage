import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,"..");
const env=Object.fromEntries(readFileSync(resolve(root,".env.goneo.local"),"utf8").split(/\r?\n/).filter(l=>l&&!l.trimStart().startsWith("#")&&l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const base="https://termine.feuerwehrfelm.de";
async function json(path,options={}){const r=await fetch(base+path,options);const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`${path}: ${p.error||r.status}`);return p;}
for(const path of ["/","/teilnahme/","/login/","/dashboard/","/profil/","/admin/termine/","/manifest.webmanifest","/sw.js","/pwa-192x192.png","/pwa-512x512.png","/apple-touch-icon.png"]){const r=await fetch(base+path);if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);}
const manifest=await json("/manifest.webmanifest");if(manifest.display!=="standalone"||!Array.isArray(manifest.icons)||manifest.icons.length<2)throw new Error("PWA-Manifest unvollständig.");
const health=await json("/api/health");if(health.status!=="ok")throw new Error("Health-Endpunkt nicht ok.");
const initial=await json("/api/data");
const initialCounts={termine:initial.termine.length,teilnehmer:initial.teilnehmer.length,rueckmeldungen:initial.rueckmeldungen.length};
if(initialCounts.termine<1||initialCounts.teilnehmer<1)throw new Error("Live-Ausgangsdaten fehlen.");
const login=await json("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:env.GONEO_INITIAL_ADMIN_EMAIL,password:env.GONEO_INITIAL_ADMIN_PASSWORD})});
const auth={"Content-Type":"application/json",Authorization:`Bearer ${login.token}`};
await json("/api/profile",{method:"PUT",headers:auth,body:JSON.stringify({vorname:login.profile.vorname||"Admin",name:login.profile.name,ortswehr:"Felm"})});
const test=await json("/api/termine",{method:"POST",headers:auth,body:JSON.stringify({titel:"[TEST] Automatischer Live-Test",datum:"2099-12-31",uhrzeit:"19:00",hinweis:"Wird automatisch entfernt"})});
try {
  await json("/api/rueckmeldungen",{method:"PUT",headers:auth,body:JSON.stringify({termin_id:test.id,profile_id:login.profile.id,teilnehmer_id:null,status:"unsicher",rolle:null})});
  const person=initial.teilnehmer[0];
  const participant=await json("/api/teilnahme/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vorname:person.vorname,name:person.name,ortswehr:person.ortswehr,code:env.GONEO_TEILNAHME_ACCESS_CODE})});
  await json("/api/rueckmeldungen",{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${participant.token}`},body:JSON.stringify({termin_id:test.id,profile_id:null,teilnehmer_id:person.id,status:"ja",rolle:"beide"})});
  const during=await json("/api/data");
  if(during.termine.length!==initialCounts.termine+1||during.rueckmeldungen.length!==initialCounts.rueckmeldungen+2)throw new Error("Live-Schreibtest nicht sichtbar.");
} finally {
  await json(`/api/termine/${test.id}`,{method:"DELETE",headers:auth});
}
const finalData=await json("/api/data");
if(finalData.termine.length!==initialCounts.termine||finalData.rueckmeldungen.length!==initialCounts.rueckmeldungen||finalData.termine.some(t=>t.id===test.id))throw new Error("Testdaten wurden nicht vollständig entfernt.");
const installer=await fetch(base+"/api/install.php");if(installer.status!==404)throw new Error(`Installer noch erreichbar: ${installer.status}`);
console.log({health:"ok",pwa:"ok",login:"ok",adminWrite:"ok",teilnahmeWrite:"ok",cleanup:"ok",counts:{profiles:initial.profiles.length,termine:finalData.termine.length,teilnehmer:finalData.teilnehmer.length,rueckmeldungen:finalData.rueckmeldungen.length}});
