import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const prismaDirectory = resolve("prisma");
const databasePath = resolve(prismaDirectory, "dev.db");
const storageRoot = resolve("storage", "ordo-campus");
const projectStorage = resolve("storage");

if (!databasePath.startsWith(`${prismaDirectory}\\`)) {
  throw new Error("Die Datenbank liegt nicht im vorgesehenen Prisma-Ordner.");
}
if (!storageRoot.startsWith(`${projectStorage}\\`)) {
  throw new Error("Der Campus-Anhangsspeicher liegt nicht im vorgesehenen Projektordner.");
}

console.warn("WARNUNG: Die lokale künstliche Testdatenbank wird vollständig gelöscht und neu aufgebaut.");
for (const path of [databasePath, `${databasePath}-journal`, `${databasePath}-wal`, `${databasePath}-shm`]) {
  if (existsSync(path)) {
    rmSync(path);
  }
}
if (existsSync(storageRoot)) {
  rmSync(storageRoot, { recursive: true });
}

const migrationFiles = readdirSync(resolve(prismaDirectory, "migrations"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve(prismaDirectory, "migrations", entry.name, "migration.sql"))
  .filter((path) => existsSync(path))
  .sort();

for (const migrationFile of migrationFiles) {
  execFileSync(
    process.execPath,
    [
      "node_modules/prisma/build/index.js",
      "db",
      "execute",
      "--file",
      migrationFile,
      "--schema",
      "prisma/schema.prisma",
    ],
    { stdio: "inherit" },
  );
}
execFileSync(process.execPath, ["--experimental-transform-types","prisma/seed.ts"], { stdio: "inherit" });

console.log("Die lokale Datenbank wurde vollständig zurückgesetzt.");
