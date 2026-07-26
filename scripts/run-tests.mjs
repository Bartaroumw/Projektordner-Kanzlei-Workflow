import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
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

execFileSync(
  process.execPath,
  [
    "node_modules/prisma/build/index.js",
    "db",
    "execute",
    "--file",
    "prisma/migrations/20260726120000_init_clients/migration.sql",
    "--schema",
    "prisma/schema.prisma",
  ],
  {
    env: environment,
    stdio: "inherit",
  },
);
execFileSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run"], {
  env: environment,
  stdio: "inherit",
});
