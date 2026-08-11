import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,"..");
const env=Object.fromEntries(readFileSync(resolve(root,".env.goneo.local"),"utf8").split(/\r?\n/).filter(l=>l&&!l.trimStart().startsWith("#")&&l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
for(const key of ["GONEO_API_ADMIN_SECRET","GONEO_INITIAL_ADMIN_EMAIL","GONEO_INITIAL_ADMIN_PASSWORD"])if(!env[key])throw new Error(`Fehlender Wert: ${key}`);
const response=await fetch("https://termine.feuerwehrfelm.de/api/install.php",{method:"POST",headers:{"Content-Type":"application/json","X-Admin-Secret":env.GONEO_API_ADMIN_SECRET},body:JSON.stringify({email:env.GONEO_INITIAL_ADMIN_EMAIL,password:env.GONEO_INITIAL_ADMIN_PASSWORD})});
const payload=await response.json().catch(()=>({}));
if(!response.ok)throw new Error(payload.error||`Installation fehlgeschlagen (${response.status}).`);
console.log(payload);
