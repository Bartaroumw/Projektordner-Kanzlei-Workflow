import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const prismaDirectory=resolve("prisma");
const database=resolve(prismaDirectory,"fibu-lohn-performance.db");
if(database!==resolve("prisma","fibu-lohn-performance.db")||!database.startsWith(`${prismaDirectory}${sep}`))throw new Error("SCHUTZABBRUCH: Falsche Performance-Datenbank.");
for(const forbidden of ["dev.db","workflow-test.db","fibu-lohn-acceptance.db","acceptance.db","pilot.db","production.db"]){
  if(database.toLocaleLowerCase().endsWith(`${sep}${forbidden}`))throw new Error(`SCHUTZABBRUCH: ${forbidden} darf nicht verändert werden.`);
}
console.warn("ACHTUNG: Ausschließlich prisma/fibu-lohn-performance.db wird neu erzeugt.");
for(const target of [database,`${database}-journal`,`${database}-wal`,`${database}-shm`])if(existsSync(target))rmSync(target);
const environment={...process.env,DATABASE_URL:"file:./fibu-lohn-performance.db",NODE_ENV:"test"};
const migrations=readdirSync(resolve(prismaDirectory,"migrations"),{withFileTypes:true})
  .filter(entry=>entry.isDirectory()).map(entry=>resolve(prismaDirectory,"migrations",entry.name,"migration.sql")).filter(existsSync).sort();
for(const migration of migrations)execFileSync(process.execPath,["node_modules/prisma/build/index.js","db","execute","--file",migration,"--schema","prisma/schema.prisma"],{env:environment,stdio:"inherit"});
execFileSync(process.execPath,["--experimental-transform-types","scripts/seed-fibu-lohn-performance.ts"],{env:environment,stdio:"inherit"});
