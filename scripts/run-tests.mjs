import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const databasePath = resolve("prisma", "test.db");
const prismaDirectory = resolve("prisma");
if (!databasePath.startsWith(`${prismaDirectory}\\`)) {
  throw new Error("Die Testdatenbank liegt nicht im vorgesehenen Prisma-Ordner.");
}
for (const path of [databasePath, `${databasePath}-journal`]) {
  if (existsSync(path)) {
    rmSync(path);
  }
}

const environment = {
  ...process.env,
  DATABASE_URL: "file:./test.db",
  NODE_ENV: "test",
};

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
    { env: environment, stdio: "inherit" },
  );
}
execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run"], {
  env: environment,
  stdio: "inherit",
});
