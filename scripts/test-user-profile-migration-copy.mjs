import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { PrismaClient } from "@prisma/client";

const projectRoot = resolve(".");
const sourcePath = resolve(projectRoot, "prisma", "dev.db");
const testRoot = resolve(projectRoot, "tmp", "user-profile-migration-copy");
const targetPath = resolve(testRoot, "dev-copy.db");
const restorePath = resolve(testRoot, "dev-copy.restore.db");
const expectedPrefix = `${testRoot}${sep}`.toLocaleLowerCase("de-DE");

for (const path of [targetPath, restorePath]) {
  if (!path.toLocaleLowerCase("de-DE").startsWith(expectedPrefix) || path === sourcePath) {
    throw new Error("SCHUTZABBRUCH: Migrationstests dürfen ausschließlich im festgelegten tmp-Ordner arbeiten.");
  }
}
if (!existsSync(sourcePath)) throw new Error("prisma/dev.db wurde nicht gefunden.");

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const databaseUrl = (path) => `file:${path.replaceAll("\\", "/")}`;
const cleanupTarget = (path) => {
  for (const candidate of [path, `${path}-journal`, `${path}-shm`, `${path}-wal`]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
};

mkdirSync(testRoot, { recursive: true });
cleanupTarget(targetPath);
cleanupTarget(restorePath);

const sourceHashBefore = sha256(sourcePath);
copyFileSync(sourcePath, targetPath);
const copyHashBefore = sha256(targetPath);
if (sourceHashBefore !== copyHashBefore) throw new Error("Die Testkopie ist nicht bytegenau.");

const serialize = (value) => JSON.stringify(value, (_key, entry) => {
  if (typeof entry === "bigint") return entry.toString();
  if (entry instanceof Uint8Array) return Buffer.from(entry).toString("base64");
  return entry;
});

async function snapshot(client, tableNames) {
  const tables = tableNames ?? (await client.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations' ORDER BY name",
  )).map((entry) => String(entry.name));
  const result = {};
  for (const table of tables) {
    if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error(`Ungültiger Tabellenname: ${table}`);
    const rows = await client.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY rowid`);
    result[table] = {
      count: rows.length,
      hash: createHash("sha256").update(serialize(rows)).digest("hex"),
    };
  }
  return result;
}

const beforeClient = new PrismaClient({ datasourceUrl: databaseUrl(targetPath) });
const before = await snapshot(beforeClient);
await beforeClient.$disconnect();

const environment = { ...process.env, DATABASE_URL: databaseUrl(targetPath) };
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { cwd: projectRoot, env: environment, stdio: "inherit" });
execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "status"], { cwd: projectRoot, env: environment, stdio: "inherit" });

const afterClient = new PrismaClient({ datasourceUrl: databaseUrl(targetPath) });
const after = await snapshot(afterClient, Object.keys(before));
const integrity = await afterClient.$queryRawUnsafe("PRAGMA quick_check");
const foreignKeys = await afterClient.$queryRawUnsafe("PRAGMA foreign_key_check");
const migrations = await afterClient.$queryRawUnsafe("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name");
const profileImages = await afterClient.userProfileImage.count();
const profileHistory = await afterClient.userProfileImageHistory.count();
const firstUser = await afterClient.user.findFirst({ select: { id: true } });
await afterClient.$disconnect();

const changedTables = Object.keys(before).filter((table) => before[table].count !== after[table].count || before[table].hash !== after[table].hash);
if (changedTables.length) throw new Error(`Bestehende Daten wurden verändert: ${changedTables.join(", ")}`);
if (serialize(integrity) !== serialize([{ quick_check: "ok" }]) || foreignKeys.length) throw new Error("SQLite-Integritätsprüfung fehlgeschlagen.");
if (migrations.length !== 17 || migrations.at(-1)?.migration_name !== "20260805120000_user_profile_images") throw new Error("Migration 17 wurde nicht korrekt registriert.");
if (profileImages !== 0 || profileHistory !== 0) throw new Error("Die additive Migration hat unerwartete Profildaten angelegt.");

copyFileSync(targetPath, restorePath);
const restoreHash = sha256(restorePath);
if (firstUser) {
  const mutationClient = new PrismaClient({ datasourceUrl: databaseUrl(targetPath) });
  await mutationClient.userProfileImageHistory.create({ data: { targetUserId: firstUser.id, actorUserId: firstUser.id, action: "Künstlicher Wiederherstellungstest" } });
  await mutationClient.$disconnect();
}
cleanupTarget(targetPath);
copyFileSync(restorePath, targetPath);
if (sha256(targetPath) !== restoreHash) throw new Error("Die Wiederherstellung der Testkopie war nicht bytegenau.");
if (sha256(sourcePath) !== sourceHashBefore) throw new Error("SCHUTZABBRUCH: prisma/dev.db wurde während des Kopientests verändert.");

console.log(JSON.stringify({
  sourcePath,
  targetPath,
  sourceHashBefore,
  copyWasByteExact: sourceHashBefore === copyHashBefore,
  existingTablesChecked: Object.keys(before).length,
  changedExistingTables: changedTables,
  appliedMigrations: migrations.length,
  quickCheck: "ok",
  foreignKeyViolations: foreignKeys.length,
  profileImages,
  profileHistory,
  restoreWasByteExact: sha256(targetPath) === restoreHash,
  sourceRemainedUnchanged: sha256(sourcePath) === sourceHashBefore,
}, null, 2));
