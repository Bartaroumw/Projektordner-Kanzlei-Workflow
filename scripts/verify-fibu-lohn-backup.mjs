import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const projectRoot=resolve(".");
const database=resolve("prisma","fibu-lohn-acceptance.db");
const storage=resolve("tmp","fibu-lohn-acceptance-storage");
const backupRoot=resolve("tmp","fibu-lohn-acceptance-backup");
const backupDatabase=resolve(backupRoot,"fibu-lohn-acceptance.db");
const backupStorage=resolve(backupRoot,"storage");
const tmpRoot=resolve("tmp");
if(database!==resolve(projectRoot,"prisma","fibu-lohn-acceptance.db"))throw new Error("SCHUTZABBRUCH: Falsche Abnahmedatenbank.");
for(const target of [storage,backupRoot]){
  if(!target.startsWith(`${tmpRoot}${sep}`))throw new Error("SCHUTZABBRUCH: Sicherungspfad liegt nicht im freigegebenen tmp-Ordner.");
}
if(!existsSync(database)||!existsSync(storage))throw new Error("Bitte zuerst npm.cmd run testdata:fibu-lohn ausführen.");
if(["-wal","-shm","-journal"].some(suffix=>existsSync(`${database}${suffix}`)))throw new Error("Die Abnahmedatenbank ist möglicherweise geöffnet. Bitte die Anwendung vor dem Backup-Test beenden.");

function sha256(path){return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase()}
function files(root){return readdirSync(root,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>resolve(root,entry.name)).sort()}
function checksums(db,root){return{database:sha256(db),files:Object.fromEntries(files(root).map(path=>[path.slice(root.length+1).replaceAll("\\","/"),sha256(path)]))}}

if(existsSync(backupRoot))rmSync(backupRoot,{recursive:true});
mkdirSync(backupRoot,{recursive:true});
copyFileSync(database,backupDatabase);
cpSync(storage,backupStorage,{recursive:true});
const before=checksums(database,storage);

const environment={...process.env,DATABASE_URL:"file:./fibu-lohn-acceptance.db",FIBU_LOHN_STORAGE_DIR:storage,NODE_ENV:"development"};
execFileSync(process.execPath,["--experimental-transform-types","scripts/mutate-fibu-lohn-acceptance.ts"],{env:environment,stdio:"inherit"});

copyFileSync(backupDatabase,database);
if(existsSync(storage))rmSync(storage,{recursive:true});
cpSync(backupStorage,storage,{recursive:true});
const after=checksums(database,storage);
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error("Wiederherstellung fehlgeschlagen: Die SHA-256-Prüfsummen stimmen nicht überein.");
execFileSync(process.execPath,["--experimental-transform-types","scripts/diagnose-fibu-lohn-acceptance.ts"],{env:environment,stdio:"inherit"});

const report={testedAt:new Date().toISOString(),database,storage,checksums:after,result:"Backup und Wiederherstellung erfolgreich"};
writeFileSync(resolve("tmp","fibu-lohn-backup-report.json"),`${JSON.stringify(report,null,2)}\n`,"utf8");
console.log(JSON.stringify(report,null,2));
