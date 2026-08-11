import { readFileSync, readdirSync } from "node:fs";
import { posix, relative, resolve } from "node:path";
import { Client } from "basic-ftp";

const root=resolve(import.meta.dirname,"..");
const env=Object.fromEntries(readFileSync(resolve(root,".env.goneo.local"),"utf8").split(/\r?\n/).filter(l=>l&&!l.trimStart().startsWith("#")&&l.includes("=")).map(l=>[l.slice(0,l.indexOf("=")),l.slice(l.indexOf("=")+1)]));
const client=new Client(60000);
client.ftp.verbose=false;
await client.access({host:env.GONEO_FTPS_HOST,port:Number(env.GONEO_FTPS_PORT),user:env.GONEO_FTPS_USER,password:env.GONEO_FTPS_PASSWORD,secure:Number(env.GONEO_FTPS_PORT)===990?"implicit":true});
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(resolve(dir,e.name)):[resolve(dir,e.name)]);}
async function upload(file,remote){const target='/'+remote.replace(/^\/+/,"");await client.ensureDir(posix.dirname(target));await client.uploadFrom(file,target);}
try {
  const mode=process.argv[2];
  if(mode==="install"){
    for(const name of [".htaccess","index.php","config.local.php","schema.sql","migration-data.json","install.php"])await upload(resolve(root,"goneo-api",name),`api/${name}`);
    console.log("Geschützte API-Installationsdateien hochgeladen.");
  } else if(mode==="api"){
    for(const name of [".htaccess","index.php","config.local.php"])await upload(resolve(root,"goneo-api",name),`api/${name}`);
    console.log("Dauerhafte API aktualisiert.");
  } else if(mode==="app"){
    for(const file of files(resolve(root,"out")))await upload(file,relative(resolve(root,"out"),file).split("\\").join("/"));
    for(const name of [".htaccess","index.php","config.local.php"])await upload(resolve(root,"goneo-api",name),`api/${name}`);
    console.log("Statischer Export und API hochgeladen.");
  } else if(mode==="cleanup"){
    for(const name of ["install.php","schema.sql","migration-data.json"])await client.remove(`/api/${name}`,true);
    console.log("Temporäre Installationsdateien vom Webspace entfernt.");
  } else if(mode==="prune"){
    for(const name of ["vercel.svg","next.svg","file.svg","globe.svg","window.svg"])await client.remove(`/${name}`,true);
    console.log("Ungenutzte Standardassets vom Webspace entfernt.");
  } else throw new Error("Modus install, api, app, cleanup oder prune erforderlich.");
} finally { client.close(); }
