import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const projectRoot = resolve(import.meta.dirname, "..");
const protectedDevelopmentDatabase = resolve(projectRoot, "prisma", "dev.db");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function jsonValue(value) {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString("hex") };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, jsonValue(entry)]));
  }
  return value;
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(jsonValue(value))).digest("hex").toUpperCase();
}

const databaseArgument = argument("--database");
if (!databaseArgument) fail("Pflichtargument fehlt: --database <Pfad-zu-einer-Kopie.db>");

const databasePath = resolve(projectRoot, databaseArgument);
const relativeDatabasePath = relative(projectRoot, databasePath);
if (relativeDatabasePath.startsWith("..") || isAbsolute(relativeDatabasePath)) {
  fail(`Die Datenbank muss innerhalb des Projektordners liegen: ${databasePath}`);
}
if (databasePath === protectedDevelopmentDatabase) {
  fail("Abbruch: prisma/dev.db darf mit diesem Prüfskript nicht geöffnet werden. Verwenden Sie eine bytegenaue Kopie.");
}
if (!existsSync(databasePath) || !statSync(databasePath).isFile()) {
  fail(`Datenbankkopie nicht gefunden: ${databasePath}`);
}

const sqlitePath = databasePath.replaceAll("\\", "/");
const prisma = new PrismaClient({ datasourceUrl: `file:${sqlitePath}?mode=ro` });

try {
  const objects = await prisma.$queryRawUnsafe(`
    SELECT type, name, tbl_name AS tableName, sql
    FROM sqlite_master
    WHERE name NOT LIKE 'sqlite_%'
    ORDER BY type, name
  `);
  const tableNames = objects
    .filter((object) => object.type === "table")
    .map((object) => object.name)
    .sort((left, right) => left.localeCompare(right));

  const tables = {};
  for (const tableName of tableNames) {
    const identifier = quoteIdentifier(tableName);
    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${identifier})`);
    const foreignKeys = await prisma.$queryRawUnsafe(`PRAGMA foreign_key_list(${identifier})`);
    const indexList = await prisma.$queryRawUnsafe(`PRAGMA index_list(${identifier})`);
    const indexes = [];
    for (const index of indexList) {
      const indexIdentifier = quoteIdentifier(index.name);
      const indexColumns = await prisma.$queryRawUnsafe(`PRAGMA index_xinfo(${indexIdentifier})`);
      indexes.push({ ...index, columns: indexColumns });
    }

    const primaryKeyColumns = columns
      .filter((column) => Number(column.pk) > 0)
      .sort((left, right) => Number(left.pk) - Number(right.pk))
      .map((column) => quoteIdentifier(column.name));
    const dataColumns = columns
      .map((column) => String(column.name))
      .sort((left, right) => left.localeCompare(right, "en"))
      .map(quoteIdentifier);
    const orderBy = primaryKeyColumns.length > 0 ? primaryKeyColumns.join(", ") : "rowid";
    const rows = await prisma.$queryRawUnsafe(
      `SELECT ${dataColumns.join(", ")} FROM ${identifier} ORDER BY ${orderBy}`,
    );

    tables[tableName] = {
      columns,
      foreignKeys,
      indexes,
      rowCount: rows.length,
      dataHash: hash(rows),
    };
  }

  const quickCheck = await prisma.$queryRawUnsafe("PRAGMA quick_check");
  const integrityCheck = await prisma.$queryRawUnsafe("PRAGMA integrity_check");
  const foreignKeyCheck = await prisma.$queryRawUnsafe("PRAGMA foreign_key_check");
  const foreignKeysEnabled = await prisma.$queryRawUnsafe("PRAGMA foreign_keys");
  const migrationRows = tables._prisma_migrations
    ? await prisma.$queryRawUnsafe('SELECT * FROM "_prisma_migrations" ORDER BY "started_at", "migration_name"')
    : [];
  const businessTables = Object.fromEntries(
    Object.entries(tables).filter(([name]) => name !== "_prisma_migrations"),
  );
  const businessTableEntries = Object.entries(businessTables);
  const report = {
    database: relativeDatabasePath.replaceAll("\\", "/"),
    fileSizeBytes: statSync(databasePath).size,
    fileSha256: createHash("sha256").update(readFileSync(databasePath)).digest("hex").toUpperCase(),
    quickCheck,
    integrityCheck,
    foreignKeyCheck,
    foreignKeysEnabled,
    objectCount: objects.length,
    tableCount: tableNames.length,
    businessTableCount: Object.keys(businessTables).length,
    totalColumns: businessTableEntries.reduce((sum, [, table]) => sum + table.columns.length, 0),
    totalForeignKeys: businessTableEntries.reduce((sum, [, table]) => sum + table.foreignKeys.length, 0),
    totalIndexes: businessTableEntries.reduce((sum, [, table]) => sum + table.indexes.length, 0),
    totalUniqueIndexes: businessTableEntries.reduce(
      (sum, [, table]) => sum + table.indexes.filter((index) => Number(index.unique) === 1).length,
      0,
    ),
    totalBusinessRows: Object.values(businessTables).reduce((sum, table) => sum + table.rowCount, 0),
    schemaHash: hash(objects.filter((object) => object.name !== "_prisma_migrations")),
    businessDataHash: hash(
      Object.fromEntries(Object.entries(businessTables).map(([name, table]) => [name, table.dataHash])),
    ),
    migrationTablePresent: Boolean(tables._prisma_migrations),
    migrationRows,
    objects,
    tables,
  };

  const output = argument("--output");
  const serialized = `${JSON.stringify(jsonValue(report), null, 2)}\n`;
  if (output) {
    const outputPath = resolve(projectRoot, output);
    const relativeOutputPath = relative(resolve(projectRoot, "tmp"), outputPath);
    if (relativeOutputPath.startsWith("..") || isAbsolute(relativeOutputPath)) {
      fail(`Ausgabedateien sind nur unter tmp zulässig: ${outputPath}`);
    }
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
    console.log(`Baseline-Analyse geschrieben: ${relative(projectRoot, outputPath)}`);
  } else {
    process.stdout.write(serialized);
  }
} finally {
  await prisma.$disconnect();
}
