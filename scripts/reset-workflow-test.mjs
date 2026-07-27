import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";

const prismaDirectory = resolve("prisma");
const databasePath = resolve(prismaDirectory, "workflow-test.db");
const campusPath = resolve("tmp", "workflow-test-campus");
const allowedDatabase = resolve("prisma", "workflow-test.db");
const allowedCampus = resolve("tmp", "workflow-test-campus");

if (databasePath !== allowedDatabase || !databasePath.startsWith(`${prismaDirectory}${sep}`)) {
  throw new Error("SCHUTZABBRUCH: Es darf ausschließlich prisma/workflow-test.db zurückgesetzt werden.");
}
if (campusPath !== allowedCampus || !campusPath.startsWith(`${resolve("tmp")}${sep}`)) {
  throw new Error("SCHUTZABBRUCH: Der Campus-Testpfad ist nicht eindeutig freigegeben.");
}
for (const forbidden of ["dev.db", "acceptance.db", "pilot.db", "production.db"]) {
  if (databasePath.toLocaleLowerCase().endsWith(forbidden)) {
    throw new Error(`SCHUTZABBRUCH: ${forbidden} darf nicht verändert werden.`);
  }
}

console.warn("ACHTUNG: Ausschließlich der künstliche Workflow-Testbestand wird vollständig neu erstellt.");
for (const path of [databasePath, `${databasePath}-journal`, `${databasePath}-shm`, `${databasePath}-wal`]) {
  if (existsSync(path)) rmSync(path);
}
if (existsSync(campusPath)) rmSync(campusPath, { recursive: true });

const environment = {
  ...process.env,
  DATABASE_URL: "file:./workflow-test.db",
  ORDO_CAMPUS_STORAGE_PATH: campusPath,
  NODE_ENV: "development",
};
const migrationFiles = readdirSync(resolve(prismaDirectory, "migrations"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(prismaDirectory, "migrations", entry.name, "migration.sql"))
  .filter(existsSync)
  .sort();
for (const migrationFile of migrationFiles) {
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "db", "execute", "--file", migrationFile, "--schema", "prisma/schema.prisma"], { env: environment, stdio: "inherit" });
}
execFileSync(process.execPath, ["--experimental-transform-types", "prisma/workflow-test-seed.ts"], { env: environment, stdio: "inherit" });
execFileSync(process.execPath, ["--experimental-transform-types", "scripts/diagnose-workflow-test.ts"], { env: environment, stdio: "inherit" });
console.log(`Workflow-Testbestand bereit: ${databasePath}`);
