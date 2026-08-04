import { createHash } from "node:crypto";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { PrismaClient, type PayrollReconciliationTopic, type Prisma } from "@prisma/client";
import {
  FIBU_LOHN_CAMPUS_KNOWLEDGE_KEY,
  FIBU_LOHN_START_TOPICS,
  FIBU_LOHN_TOPIC_STATUS,
  FIBU_LOHN_TOPIC_TYPE,
  FIBU_LOHN_TOPIC_VALID_FROM,
  fibuLohnTopicNotes,
} from "../lib/fibu-lohn-topic-catalog.ts";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const DEVELOPMENT_DATABASE = resolve(PROJECT_ROOT, "prisma", "dev.db");
const DEVELOPMENT_DATABASE_URL = "file:./dev.db";
const DEFAULT_ACTOR = "klara.leitung";
const ALLOWED_CHANGED_TABLES = new Set(["PayrollReconciliationTopic", "PayrollReconciliationTopicHistory"]);
const { loadEnvConfig } = nextEnv;

type DatabaseCheck = {
  quickCheck: unknown[];
  foreignKeyCheck: unknown[];
};

type TableFingerprint = {
  rowCount: number;
  dataSha256: string;
};

type DatabaseFingerprint = Record<string, TableFingerprint>;

type ProvisioningOptions = {
  databasePath: string;
  databaseLabel: string;
  actorUsername: string;
  campusStoragePath: string;
  payrollStoragePath: string;
  environmentLabel: string;
  backupParent: string;
  backupRequired: boolean;
};

type ProvisioningChange = {
  key: string;
  action: "angelegt" | "vorsichtig ergänzt" | "unverändert erkannt";
  fields: string[];
};

export type ProvisioningReport = {
  startedAt: string;
  completedAt: string;
  environment: {
    label: string;
    databaseLabel: string;
    databasePath: string;
    nodeEnvironment: string;
    campusStoragePath: string;
    payrollStoragePath: string;
  };
  actor: { id: number; username: string; fullName: string };
  backup: ReturnType<typeof createBackupSet> | null;
  before: {
    databaseSha256: string;
    checks: DatabaseCheck;
    topicCount: number;
    activeStartTopicCount: number;
    reconciliationCount: number;
    snapshotCount: number;
  };
  changes: ProvisioningChange[];
  after: {
    databaseSha256: string;
    checks: DatabaseCheck;
    topicCount: number;
    activeStartTopicCount: number;
    reconciliationCount: number;
    snapshotCount: number;
    topics: Array<ReturnType<typeof serializeTopic>>;
  };
  unchangedTablesVerified: string[];
  existingReconciliationsAndSnapshotsUnchanged: boolean;
  manualContentOverwritten: false;
  migrationRequired: false;
};

function samePath(left: string, right: string) {
  return resolve(left).toLocaleLowerCase("de-DE") === resolve(right).toLocaleLowerCase("de-DE");
}

function sha256(value: Buffer | string) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function fileSha256(path: string) {
  return sha256(readFileSync(path));
}

function normalizedJson(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Uint8Array) return { $bytes: Buffer.from(value).toString("hex") };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Array.isArray(value)) return value.map(normalizedJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizedJson(entry)]));
  }
  return value;
}

function valueSha256(value: unknown) {
  return sha256(JSON.stringify(normalizedJson(value)));
}

function quoteIdentifier(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sqliteUrl(path: string, readOnly = false) {
  const normalized = resolve(path).replaceAll("\\", "/");
  return `file:${normalized}${readOnly ? "?mode=ro" : ""}`;
}

function timestamp(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  const local = new Date(date.getTime() + offset * 60_000).toISOString().replace("Z", `${sign}${hours}:${minutes}`);
  return local;
}

function backupTimestamp(date = new Date()) {
  return timestamp(date).slice(0, 23).replaceAll(":", "-").replace("T", "_").replace(".", "-");
}

function filesRecursively(root: string): string[] {
  if (!existsSync(root)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) result.push(...filesRecursively(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort((left, right) => left.localeCompare(right, "de"));
}

function storageManifest(root: string) {
  return {
    present: existsSync(root),
    files: Object.fromEntries(
      filesRecursively(root).map((path) => [relative(root, path).replaceAll("\\", "/"), fileSha256(path)]),
    ),
  };
}

function assertNoSqliteSidecars(databasePath: string) {
  const sidecars = ["-wal", "-shm", "-journal"].filter((suffix) => existsSync(`${databasePath}${suffix}`));
  if (sidecars.length) {
    throw new Error(`SCHUTZABBRUCH: SQLite-Seitendateien vorhanden (${sidecars.join(", ")}). Bitte Anwendung vollständig beenden.`);
  }
}

function createBackupSet(options: ProvisioningOptions, databaseSha256: string) {
  const backupPath = resolve(options.backupParent, `${backupTimestamp()}_fibu-lohn-themen`);
  if (existsSync(backupPath)) throw new Error(`SCHUTZABBRUCH: Backup-Ziel existiert bereits: ${backupPath}`);
  mkdirSync(resolve(backupPath, "prisma"), { recursive: true });
  mkdirSync(resolve(backupPath, "storage"), { recursive: true });

  const backupDatabase = resolve(backupPath, "prisma", basename(options.databasePath));
  copyFileSync(options.databasePath, backupDatabase);
  if (fileSha256(backupDatabase) !== databaseSha256) {
    throw new Error("SCHUTZABBRUCH: Die Datenbankkopie stimmt nicht bytegenau mit dem Ausgangsbestand überein.");
  }

  const sourceCampus = storageManifest(options.campusStoragePath);
  const sourcePayroll = storageManifest(options.payrollStoragePath);
  const backupCampusPath = resolve(backupPath, "storage", "ordo-campus");
  const backupPayrollPath = resolve(backupPath, "storage", "fibu-lohn");
  if (sourceCampus.present) cpSync(options.campusStoragePath, backupCampusPath, { recursive: true });
  if (sourcePayroll.present) cpSync(options.payrollStoragePath, backupPayrollPath, { recursive: true });
  const backupCampus = storageManifest(backupCampusPath);
  const backupPayroll = storageManifest(backupPayrollPath);
  if (JSON.stringify(sourceCampus.files) !== JSON.stringify(backupCampus.files) ||
      JSON.stringify(sourcePayroll.files) !== JSON.stringify(backupPayroll.files)) {
    throw new Error("SCHUTZABBRUCH: Mindestens ein geschützter Speicher wurde nicht bytegenau gesichert.");
  }

  const envPath = resolve(PROJECT_ROOT, ".env");
  const backupEnvPath = resolve(backupPath, ".env");
  if (existsSync(envPath)) copyFileSync(envPath, backupEnvPath);
  const manifest = {
    createdAt: timestamp(),
    sourceDatabase: options.databasePath,
    databaseSha256,
    campusStorage: sourceCampus,
    payrollStorage: sourcePayroll,
    environmentFile: existsSync(envPath) ? { present: true, sha256: fileSha256(backupEnvPath) } : { present: false },
  };
  writeFileSync(resolve(backupPath, "backup-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { backupPath, backupDatabase, manifest };
}

async function checks(prisma: PrismaClient): Promise<DatabaseCheck> {
  const quickCheck = await prisma.$queryRawUnsafe<unknown[]>("PRAGMA quick_check");
  const foreignKeyCheck = await prisma.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check");
  const quickValues = quickCheck.flatMap((row) => Object.values(row as Record<string, unknown>));
  if (quickValues.length !== 1 || quickValues[0] !== "ok") {
    throw new Error(`SCHUTZABBRUCH: PRAGMA quick_check ist nicht erfolgreich: ${JSON.stringify(normalizedJson(quickCheck))}`);
  }
  if (foreignKeyCheck.length) {
    throw new Error(`SCHUTZABBRUCH: PRAGMA foreign_key_check meldet Fehler: ${JSON.stringify(normalizedJson(foreignKeyCheck))}`);
  }
  return { quickCheck, foreignKeyCheck };
}

async function fingerprint(prisma: PrismaClient): Promise<DatabaseFingerprint> {
  const tables = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const result: DatabaseFingerprint = {};
  for (const { name } of tables) {
    const identifier = quoteIdentifier(name);
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string; pk: bigint | number }>>(`PRAGMA table_info(${identifier})`);
    const selectColumns = columns.map((column) => quoteIdentifier(column.name)).sort((left, right) => left.localeCompare(right, "en"));
    const primaryKey = columns
      .filter((column) => Number(column.pk) > 0)
      .sort((left, right) => Number(left.pk) - Number(right.pk))
      .map((column) => quoteIdentifier(column.name));
    const rows = await prisma.$queryRawUnsafe<unknown[]>(
      `SELECT ${selectColumns.join(", ")} FROM ${identifier} ORDER BY ${primaryKey.length ? primaryKey.join(", ") : "rowid"}`,
    );
    result[name] = { rowCount: rows.length, dataSha256: valueSha256(rows) };
  }
  return result;
}

function unchangedTableNames(before: DatabaseFingerprint, after: DatabaseFingerprint) {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const changedOutsideScope = names.filter((name) =>
    !ALLOWED_CHANGED_TABLES.has(name) && JSON.stringify(before[name]) !== JSON.stringify(after[name]),
  );
  if (changedOutsideScope.length) {
    throw new Error(`SCHUTZABBRUCH: Außerhalb des erlaubten Themenbereichs wurden Tabellen verändert: ${changedOutsideScope.join(", ")}`);
  }
  return names.filter((name) => !ALLOWED_CHANGED_TABLES.has(name));
}

function serializeTopic(topic: PayrollReconciliationTopic) {
  return {
    id: topic.id,
    key: topic.key,
    title: topic.title,
    shortDescription: topic.shortDescription,
    reviewQuestion: topic.reviewQuestion,
    sortOrder: topic.sortOrder,
    status: topic.status,
    validFrom: topic.validFrom.toISOString(),
    validUntil: topic.validUntil?.toISOString() ?? null,
    topicType: topic.topicType,
    vehicleRelated: topic.vehicleRelated,
    followUpAllowed: topic.followUpAllowed,
    campusStandardTaskId: topic.campusStandardTaskId,
    requiredStandardFields: topic.requiredStandardFields,
    requiredDocumentTypes: topic.requiredDocumentTypes,
    notes: topic.notes,
    createdByUserId: topic.createdByUserId,
  };
}

function countActiveStartTopics(topics: PayrollReconciliationTopic[]) {
  const keys = new Set(FIBU_LOHN_START_TOPICS.map((topic) => topic.key));
  return topics.filter((topic) => keys.has(topic.key as (typeof FIBU_LOHN_START_TOPICS)[number]["key"]) && topic.status === "Aktiv").length;
}

async function findCampusStandardTask(prisma: PrismaClient) {
  const tasks = await prisma.standardTask.findMany({
    where: { knowledgeKey: FIBU_LOHN_CAMPUS_KNOWLEDGE_KEY },
    select: { id: true, taskId: true, title: true, campusKnowledge: { select: { id: true, status: true } } },
  });
  if (tasks.length > 1) {
    throw new Error(`SCHUTZABBRUCH: Mehrere Standardaufgaben verwenden den Wissensschlüssel ${FIBU_LOHN_CAMPUS_KNOWLEDGE_KEY}.`);
  }
  return tasks[0] ?? null;
}

function safeMissingValues(topic: PayrollReconciliationTopic, expected: (typeof FIBU_LOHN_START_TOPICS)[number], campusStandardTaskId: number | null) {
  const data: Prisma.PayrollReconciliationTopicUpdateInput = {};
  const fields: string[] = [];
  if (!topic.requiredStandardFields.trim()) {
    data.requiredStandardFields = JSON.stringify(expected.requiredStandardFields);
    fields.push("requiredStandardFields");
  }
  if (!topic.requiredDocumentTypes.trim()) {
    data.requiredDocumentTypes = JSON.stringify(expected.requiredDocumentTypes);
    fields.push("requiredDocumentTypes");
  }
  if (topic.campusStandardTaskId === null && campusStandardTaskId !== null) {
    data.campusStandardTask = { connect: { id: campusStandardTaskId } };
    fields.push("campusStandardTaskId");
  }
  return { data, fields };
}

export async function provisionFibuLohnTopics(options: ProvisioningOptions): Promise<ProvisioningReport> {
  const databasePath = resolve(options.databasePath);
  if (!existsSync(databasePath) || !statSync(databasePath).isFile()) {
    throw new Error(`SCHUTZABBRUCH: Datenbank nicht gefunden: ${databasePath}`);
  }
  assertNoSqliteSidecars(databasePath);

  const startedAt = timestamp();
  const beforeFileSha256 = fileSha256(databasePath);
  const prisma = new PrismaClient({ datasourceUrl: sqliteUrl(databasePath) });
  let backup: ReturnType<typeof createBackupSet> | null = null;
  try {
    const beforeChecks = await checks(prisma);
    const beforeFingerprint = await fingerprint(prisma);
    const [beforeTopics, beforeReconciliationCount, beforeSnapshotCount] = await Promise.all([
      prisma.payrollReconciliationTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { key: "asc" }] }),
      prisma.payrollReconciliation.count(),
      prisma.payrollReconciliationItem.count(),
    ]);

    await prisma.$disconnect();
    assertNoSqliteSidecars(databasePath);
    if (fileSha256(databasePath) !== beforeFileSha256) {
      throw new Error("SCHUTZABBRUCH: Die Datenbankdatei änderte sich bereits während der Vorprüfung.");
    }
    if (options.backupRequired) backup = createBackupSet(options, beforeFileSha256);
    await prisma.$connect();

    const actor = await prisma.user.findUnique({
      where: { username: options.actorUsername },
      include: { roles: { select: { role: true } } },
    });
    if (!actor?.active || !actor.roles.some(({ role }) => role === "KANZLEILEITUNG" || role === "FIBU_LOHN_THEMEN_VERWALTEN")) {
      throw new Error(`SCHUTZABBRUCH: Der Audit-Benutzer ${options.actorUsername} fehlt, ist inaktiv oder darf Themen nicht verwalten.`);
    }
    const campusTask = await findCampusStandardTask(prisma);
    const changes: ProvisioningChange[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [index, expected] of FIBU_LOHN_START_TOPICS.entries()) {
        const existing = await tx.payrollReconciliationTopic.findUnique({ where: { key: expected.key } });
        if (!existing) {
          const data = {
            key: expected.key,
            title: expected.title,
            shortDescription: expected.shortDescription,
            reviewQuestion: expected.reviewQuestion,
            sortOrder: (index + 1) * 10,
            status: FIBU_LOHN_TOPIC_STATUS,
            validFrom: new Date(FIBU_LOHN_TOPIC_VALID_FROM),
            validUntil: null,
            topicType: FIBU_LOHN_TOPIC_TYPE,
            vehicleRelated: expected.vehicleRelated,
            followUpAllowed: expected.followUpAllowed,
            campusStandardTaskId: campusTask?.id ?? null,
            requiredStandardFields: JSON.stringify(expected.requiredStandardFields),
            requiredDocumentTypes: JSON.stringify(expected.requiredDocumentTypes),
            notes: fibuLohnTopicNotes(expected.followUpAllowed),
            createdByUserId: actor.id,
          };
          const topic = await tx.payrollReconciliationTopic.create({ data });
          await tx.payrollReconciliationTopicHistory.create({ data: {
            topicId: topic.id,
            actorUserId: actor.id,
            actorNameSnapshot: actor.fullName,
            action: "Thema bereitgestellt",
            summary: `Künstliches Startthema „${topic.title}“ wurde durch die kontrollierte Provisionierung angelegt.`,
            newValue: JSON.stringify(data),
          } });
          changes.push({ key: expected.key, action: "angelegt", fields: Object.keys(data) });
          continue;
        }

        const completion = safeMissingValues(existing, expected, campusTask?.id ?? null);
        if (!completion.fields.length) {
          changes.push({ key: expected.key, action: "unverändert erkannt", fields: [] });
          continue;
        }
        const updated = await tx.payrollReconciliationTopic.update({ where: { id: existing.id }, data: completion.data });
        await tx.payrollReconciliationTopicHistory.create({ data: {
          topicId: updated.id,
          actorUserId: actor.id,
          actorNameSnapshot: actor.fullName,
          action: "Technische Pflichtwerte ergänzt",
          summary: `Am vorhandenen Startthema „${updated.title}“ wurden ausschließlich eindeutig fehlende technische Werte ergänzt: ${completion.fields.join(", ")}.`,
          previousValue: JSON.stringify(serializeTopic(existing)),
          newValue: JSON.stringify(serializeTopic(updated)),
        } });
        changes.push({ key: expected.key, action: "vorsichtig ergänzt", fields: completion.fields });
      }
    });

    const afterChecks = await checks(prisma);
    const afterFingerprint = await fingerprint(prisma);
    const unchangedTablesVerified = unchangedTableNames(beforeFingerprint, afterFingerprint);
    const [afterTopics, afterReconciliationCount, afterSnapshotCount] = await Promise.all([
      prisma.payrollReconciliationTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { key: "asc" }] }),
      prisma.payrollReconciliation.count(),
      prisma.payrollReconciliationItem.count(),
    ]);
    const startKeys = new Set(FIBU_LOHN_START_TOPICS.map((topic) => topic.key));
    const provisionedTopics = afterTopics.filter((topic) => startKeys.has(topic.key as (typeof FIBU_LOHN_START_TOPICS)[number]["key"]));
    if (provisionedTopics.length !== FIBU_LOHN_START_TOPICS.length || countActiveStartTopics(provisionedTopics) !== FIBU_LOHN_START_TOPICS.length) {
      throw new Error("SCHUTZABBRUCH: Nach der Provisionierung sind nicht genau sechs aktive Startthemen vorhanden.");
    }
    if (beforeReconciliationCount !== afterReconciliationCount || beforeSnapshotCount !== afterSnapshotCount) {
      throw new Error("SCHUTZABBRUCH: Bestehende Abstimmungen oder Themen-Snapshots wurden verändert.");
    }
    await prisma.$disconnect();
    assertNoSqliteSidecars(databasePath);
    const afterFileSha256 = fileSha256(databasePath);
    const report: ProvisioningReport = {
      startedAt,
      completedAt: timestamp(),
      environment: {
        label: options.environmentLabel,
        databaseLabel: options.databaseLabel,
        databasePath,
        nodeEnvironment: process.env.NODE_ENV ?? "development (Standard)",
        campusStoragePath: options.campusStoragePath,
        payrollStoragePath: options.payrollStoragePath,
      },
      actor: { id: actor.id, username: actor.username, fullName: actor.fullName },
      backup,
      before: {
        databaseSha256: beforeFileSha256,
        checks: beforeChecks,
        topicCount: beforeTopics.length,
        activeStartTopicCount: countActiveStartTopics(beforeTopics),
        reconciliationCount: beforeReconciliationCount,
        snapshotCount: beforeSnapshotCount,
      },
      changes,
      after: {
        databaseSha256: afterFileSha256,
        checks: afterChecks,
        topicCount: afterTopics.length,
        activeStartTopicCount: countActiveStartTopics(provisionedTopics),
        reconciliationCount: afterReconciliationCount,
        snapshotCount: afterSnapshotCount,
        topics: provisionedTopics.map(serializeTopic),
      },
      unchangedTablesVerified,
      existingReconciliationsAndSnapshotsUnchanged: true,
      manualContentOverwritten: false,
      migrationRequired: false,
    };
    if (backup) {
      writeFileSync(resolve(backup.backupPath, "provisionierungsprotokoll.json"), `${JSON.stringify(normalizedJson(report), null, 2)}\n`, "utf8");
    }
    return report;
  } finally {
    await prisma.$disconnect();
  }
}

function argument(name: string) {
  const prefix = `${name}=`;
  const combined = process.argv.find((entry) => entry.startsWith(prefix));
  if (combined) return combined.slice(prefix.length);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  loadEnvConfig(PROJECT_ROOT, true);
  const configuredUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, "");
  const actorUsername = argument("--actor") ?? DEFAULT_ACTOR;
  const campusStoragePath = resolve(PROJECT_ROOT, process.env.ORDO_CAMPUS_STORAGE_DIR ?? "storage/ordo-campus");
  const payrollStoragePath = resolve(PROJECT_ROOT, process.env.FIBU_LOHN_STORAGE_DIR ?? "storage/fibu-lohn");
  const environmentLabel = process.env.ORDO_ENVIRONMENT_LABEL ?? "Lokale Entwicklungsumgebung";

  console.log("FiBu-Lohn-Themen – geschützte Provisionierung");
  console.log(`Umgebung: ${environmentLabel}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? "development (Standard)"}`);
  console.log(`DATABASE_URL: ${configuredUrl ?? "nicht gesetzt"}`);
  console.log(`Datenbankpfad: ${DEVELOPMENT_DATABASE}`);
  console.log(`Campus-Speicher: ${campusStoragePath}`);
  console.log(`FiBu-Lohn-Speicher: ${payrollStoragePath}`);
  console.log(`Audit-Benutzer: ${actorUsername}`);

  if (!process.argv.includes("--confirm-dev-db")) {
    throw new Error("SCHUTZABBRUCH: Bewusste Freigabe fehlt. Erneut mit --confirm-dev-db ausführen.");
  }
  if (configuredUrl !== DEVELOPMENT_DATABASE_URL) {
    throw new Error(`SCHUTZABBRUCH: Erwartet wird exakt DATABASE_URL=${DEVELOPMENT_DATABASE_URL}.`);
  }
  if (!samePath(DEVELOPMENT_DATABASE, resolve(PROJECT_ROOT, "prisma", "dev.db"))) {
    throw new Error("SCHUTZABBRUCH: Der aufgelöste Datenbankpfad ist nicht prisma/dev.db.");
  }
  const backupParent = resolve(PROJECT_ROOT, "backups");
  if (relative(PROJECT_ROOT, backupParent).startsWith("..") || isAbsolute(relative(PROJECT_ROOT, backupParent))) {
    throw new Error("SCHUTZABBRUCH: Der Backup-Pfad liegt außerhalb des Projekts.");
  }
  for (const storagePath of [campusStoragePath, payrollStoragePath]) {
    if (!samePath(dirname(storagePath), resolve(PROJECT_ROOT, "storage"))) {
      throw new Error(`SCHUTZABBRUCH: Unerwarteter regulärer Speicherpfad: ${storagePath}`);
    }
  }

  const report = await provisionFibuLohnTopics({
    databasePath: DEVELOPMENT_DATABASE,
    databaseLabel: DEVELOPMENT_DATABASE_URL,
    actorUsername,
    campusStoragePath,
    payrollStoragePath,
    environmentLabel,
    backupParent,
    backupRequired: true,
  });
  console.log(JSON.stringify(normalizedJson(report), null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
