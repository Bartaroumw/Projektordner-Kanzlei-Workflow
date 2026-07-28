import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const projectRoot=resolve(".");
const prismaDirectory=resolve(projectRoot,"prisma");
const tmpDirectory=resolve(projectRoot,"tmp");
const databasePath=resolve(prismaDirectory,"fibu-lohn-acceptance.db");
const payrollStorage=resolve(tmpDirectory,"fibu-lohn-acceptance-storage");
const campusStorage=resolve(tmpDirectory,"fibu-lohn-acceptance-campus");

function assertExactPath(actual,expected,root,label){
  if(actual!==expected||!actual.startsWith(`${root}${sep}`))throw new Error(`SCHUTZABBRUCH: ${label} ist nicht der ausdrücklich freigegebene Abnahmepfad.`);
}
assertExactPath(databasePath,resolve("prisma","fibu-lohn-acceptance.db"),prismaDirectory,"Datenbank");
assertExactPath(payrollStorage,resolve("tmp","fibu-lohn-acceptance-storage"),tmpDirectory,"FiBu-Lohn-Speicher");
assertExactPath(campusStorage,resolve("tmp","fibu-lohn-acceptance-campus"),tmpDirectory,"Campus-Speicher");
for(const forbidden of ["dev.db","test.db","workflow-test.db","acceptance.db","pilot.db","production.db"]){
  if(databasePath.toLocaleLowerCase().endsWith(`${sep}${forbidden}`))throw new Error(`SCHUTZABBRUCH: ${forbidden} darf nicht verändert werden.`);
}

console.warn("ACHTUNG: Ausschließlich prisma/fibu-lohn-acceptance.db und die zugehörigen tmp-Abnahmespeicher werden vollständig neu erstellt.");
for(const target of [databasePath,`${databasePath}-journal`,`${databasePath}-shm`,`${databasePath}-wal`]){
  if(existsSync(target))rmSync(target);
}
for(const target of [payrollStorage,campusStorage]){
  if(existsSync(target))rmSync(target,{recursive:true});
}

const environment={
  ...process.env,
  DATABASE_URL:"file:./fibu-lohn-acceptance.db",
  FIBU_LOHN_STORAGE_DIR:payrollStorage,
  ORDO_CAMPUS_STORAGE_DIR:campusStorage,
  NODE_ENV:"development",
};
const migrationFiles=readdirSync(resolve(prismaDirectory,"migrations"),{withFileTypes:true})
  .filter(entry=>entry.isDirectory())
  .map(entry=>resolve(prismaDirectory,"migrations",entry.name,"migration.sql"))
  .filter(existsSync)
  .sort();
for(const migrationFile of migrationFiles){
  execFileSync(process.execPath,["node_modules/prisma/build/index.js","db","execute","--file",migrationFile,"--schema","prisma/schema.prisma"],{env:environment,stdio:"inherit"});
}
execFileSync(process.execPath,["--experimental-transform-types","prisma/seed.ts"],{env:environment,stdio:"inherit"});
execFileSync(
  process.execPath,
  [
    "--import",
    "./scripts/register-typescript-paths.mjs",
    "--experimental-transform-types",
    "prisma/fibu-lohn-acceptance-seed.ts",
  ],
  {env:environment,stdio:"inherit"},
);
execFileSync(process.execPath,["--experimental-transform-types","scripts/diagnose-fibu-lohn-acceptance.ts"],{env:environment,stdio:"inherit"});
console.log(`FiBu-Lohn-Abnahmebestand bereit: ${databasePath}`);
console.log(`Geschützter Abnahmespeicher: ${payrollStorage}`);
