import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {copyFileSync,existsSync,mkdirSync,readFileSync,readdirSync,rmSync,statSync} from "node:fs";
import {resolve,sep} from "node:path";
import {PrismaClient} from "@prisma/client";

const root=resolve(".");
const source=resolve(root,"prisma","dev.db");
const testRoot=resolve(root,"tmp","workflow-simplification-migration-copy");
const target=resolve(testRoot,"dev-copy.db");
const restore=resolve(testRoot,"restore.db");
const allowedPrefix=`${testRoot}${sep}`.toLocaleLowerCase("de-DE");
for(const file of [target,restore])if(!file.toLocaleLowerCase("de-DE").startsWith(allowedPrefix)||file===source)throw new Error("SCHUTZABBRUCH: Der Migrationstest darf ausschließlich in tmp arbeiten.");
if(!existsSync(source))throw new Error("prisma/dev.db wurde nicht gefunden.");

const sha=file=>createHash("sha256").update(readFileSync(file)).digest("hex");
const url=file=>`file:${file.replaceAll("\\","/")}`;
const serialize=value=>JSON.stringify(value,(_key,item)=>typeof item==="bigint"?item.toString():item instanceof Uint8Array?Buffer.from(item).toString("base64"):item);
const cleanup=file=>{for(const candidate of [file,`${file}-journal`,`${file}-shm`,`${file}-wal`])if(existsSync(candidate))rmSync(candidate)};
function storageSnapshot(path){const folder=resolve(root,path);if(!existsSync(folder))return[];return readdirSync(folder,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>{const absolute=resolve(entry.parentPath??entry.path,entry.name);return{name:absolute.slice(folder.length+1).replaceAll("\\","/"),size:statSync(absolute).size,sha256:sha(absolute)}}).sort((a,b)=>a.name.localeCompare(b.name,"de"))}

mkdirSync(testRoot,{recursive:true});cleanup(target);cleanup(restore);
const sourceHash=sha(source);
const storageBefore={campus:storageSnapshot("storage/ordo-campus"),payroll:storageSnapshot("storage/fibu-lohn"),profiles:storageSnapshot("storage/profile-images")};
copyFileSync(source,target);
if(sha(target)!==sourceHash)throw new Error("Die Datenbankkopie ist nicht bytegenau.");

const beforeClient=new PrismaClient({datasourceUrl:url(target)});
const tables=(await beforeClient.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name")).map(row=>String(row.name));
const columns={};
const snapshots={};
for(const table of tables){
  if(!/^[A-Za-z0-9_]+$/.test(table))throw new Error("Ungültiger Tabellenname.");
  columns[table]=(await beforeClient.$queryRawUnsafe(`PRAGMA table_info("${table}")`)).map(row=>String(row.name));
  const selection=columns[table].map(column=>`"${column}"`).join(",");
  const rows=await beforeClient.$queryRawUnsafe(`SELECT ${selection} FROM "${table}" ORDER BY rowid`);
  if(table==="PayrollReconciliation")for(const row of rows)if(row.payrollStatus==="Gesehen")row.payrollStatus="In Bearbeitung";
  snapshots[table]={count:rows.length,hash:createHash("sha256").update(serialize(rows)).digest("hex")};
}
const migrationsBefore=await beforeClient.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name");
await beforeClient.$disconnect();

const env={...process.env,DATABASE_URL:url(target)};
const prismaCli="node_modules/prisma/build/index.js";
execFileSync(process.execPath,[prismaCli,"migrate","deploy"],{cwd:root,env,stdio:"inherit"});

const afterClient=new PrismaClient({datasourceUrl:url(target)});
const changed=[];
for(const table of tables){
  const selection=columns[table].map(column=>`"${column}"`).join(",");
  const rows=await afterClient.$queryRawUnsafe(`SELECT ${selection} FROM "${table}" ORDER BY rowid`);
  const snapshot={count:rows.length,hash:createHash("sha256").update(serialize(rows)).digest("hex")};
  if(snapshot.count!==snapshots[table].count||snapshot.hash!==snapshots[table].hash)changed.push(table);
}
const quick=await afterClient.$queryRawUnsafe("PRAGMA quick_check");
const foreignKeys=await afterClient.$queryRawUnsafe("PRAGMA foreign_key_check");
const migrations=await afterClient.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name");
const taskColumns=(await afterClient.$queryRawUnsafe('PRAGMA table_info("ChecklistTask")')).map(row=>String(row.name));
const payrollColumns=(await afterClient.$queryRawUnsafe('PRAGMA table_info("PayrollReconciliation")')).map(row=>String(row.name));
const oldSeen=await afterClient.payrollReconciliation.count({where:{payrollStatus:"Gesehen"}});
await afterClient.$disconnect();

if(changed.length)throw new Error(`Bestehende Fachdaten wurden unerwartet verändert: ${changed.join(", ")}`);
if(serialize(quick)!==serialize([{quick_check:"ok"}])||foreignKeys.length)throw new Error("SQLite-Integritäts- oder Fremdschlüsselprüfung fehlgeschlagen.");
if(migrationsBefore.length!==18||migrations.length!==19||migrations.at(-1)?.migration_name!=="20260818120000_workflow_simplification")throw new Error("Migration 19 wurde nicht korrekt registriert.");
for(const column of ["transferNote","transferStatus","transferProposedAt","transferProposedByUserId","transferDecidedAt","transferDecidedByUserId","transferDecisionReason"])if(!taskColumns.includes(column))throw new Error(`ChecklistTask.${column} fehlt.`);
for(const column of ["firstViewedAt","firstViewedByUserId","lastViewedAt"])if(!payrollColumns.includes(column))throw new Error(`PayrollReconciliation.${column} fehlt.`);
if(oldSeen)throw new Error("Der frühere Lohnstatus Gesehen wurde nicht vollständig überführt.");

const firstHash=sha(target);
execFileSync(process.execPath,[prismaCli,"migrate","deploy"],{cwd:root,env,stdio:"inherit"});
if(sha(target)!==firstHash)throw new Error("Ein zweiter Deploy-Lauf hat die bereits migrierte Kopie verändert.");
copyFileSync(target,restore);
const restoreHash=sha(restore);
const mutation=new PrismaClient({datasourceUrl:url(target)});
await mutation.$executeRawUnsafe('UPDATE "PayrollReconciliation" SET "lastViewedAt" = CURRENT_TIMESTAMP WHERE "id" = (SELECT MIN("id") FROM "PayrollReconciliation")');
await mutation.$disconnect();
cleanup(target);copyFileSync(restore,target);
if(sha(target)!==restoreHash)throw new Error("Die Wiederherstellung der Kopie war nicht bytegenau.");
if(sha(source)!==sourceHash)throw new Error("SCHUTZABBRUCH: prisma/dev.db wurde verändert.");
const storageAfter={campus:storageSnapshot("storage/ordo-campus"),payroll:storageSnapshot("storage/fibu-lohn"),profiles:storageSnapshot("storage/profile-images")};
if(serialize(storageBefore)!==serialize(storageAfter))throw new Error("Ein regulärer Speicher wurde während des Kopientests verändert.");

console.log(JSON.stringify({source,target,sourceHash,copyWasByteExact:true,oldTablesChecked:tables.length,unchangedOldTables:tables.length-changed.length,migrationsBefore:migrationsBefore.length,migrationsAfter:migrations.length,migration:migrations.at(-1)?.migration_name,quickCheck:"ok",foreignKeyViolations:foreignKeys.length,legacySeenStatusesRemaining:oldSeen,secondDeployChangedDatabase:false,restoreWasByteExact:true,sourceRemainedUnchanged:true,regularStorageRemainedUnchanged:true},null,2));
