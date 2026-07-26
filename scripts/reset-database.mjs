import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const prismaDirectory = resolve("prisma");
const databasePath = resolve(prismaDirectory, "dev.db");

if (!databasePath.startsWith(`${prismaDirectory}\\`)) {
  throw new Error("Die Datenbank liegt nicht im vorgesehenen Prisma-Ordner.");
}

for (const path of [databasePath, `${databasePath}-journal`]) {
  if (existsSync(path)) {
    rmSync(path);
  }
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
execFileSync(process.execPath, ["prisma/seed.mjs"], { stdio: "inherit" });

console.log("Die lokale Datenbank wurde vollständig zurückgesetzt.");
