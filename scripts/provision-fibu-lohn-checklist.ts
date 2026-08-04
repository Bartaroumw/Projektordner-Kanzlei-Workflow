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
import { basename, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  FIBU_LOHN_CHECKLIST_CATEGORY,
  FIBU_LOHN_CHECKLIST_KNOWLEDGE,
  FIBU_LOHN_CHECKLIST_TASK,
} from "../lib/fibu-lohn-checklist-catalog.ts";
import { FIBU_LOHN_START_TOPICS } from "../lib/fibu-lohn-topic-catalog.ts";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const DEVELOPMENT_DATABASE = resolve(PROJECT_ROOT, "prisma", "dev.db");
const DEVELOPMENT_DATABASE_URL = "file:./dev.db";
const DEFAULT_ACTOR = "klara.leitung";
const { loadEnvConfig } = nextEnv;

export type ChecklistProvisioningOptions = {
  databasePath: string;
  actorUsername: string;
  environmentLabel: string;
  campusStoragePath: string;
  payrollStoragePath: string;
  backupParent: string;
  backupRequired: boolean;
};

function sqliteUrl(path: string) {
  return `file:${resolve(path).replaceAll("\\", "/")}`;
}

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function timestamp(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0");
  const minutes = String(Math.abs(offset) % 60).padStart(2, "0");
  return new Date(date.getTime() + offset * 60_000).toISOString().replace("Z", `${sign}${hours}:${minutes}`);
}

function backupTimestamp() {
  return timestamp().slice(0, 23).replaceAll(":", "-").replace("T", "_").replace(".", "-");
}

function assertNoSidecars(databasePath: string) {
  const sidecars = ["-wal", "-shm", "-journal"].filter((suffix) => existsSync(`${databasePath}${suffix}`));
  if (sidecars.length) {
    throw new Error(`SCHUTZABBRUCH: SQLite-Seitendateien vorhanden (${sidecars.join(", ")}). Bitte Anwendung vollständig beenden.`);
  }
}

function filesRecursively(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? filesRecursively(path) : entry.isFile() ? [path] : [];
  }).sort((left, right) => left.localeCompare(right, "de"));
}

function storageManifest(root: string) {
  return Object.fromEntries(filesRecursively(root).map((path) => [relative(root, path).replaceAll("\\", "/"), sha256File(path)]));
}

function createBackup(options: ChecklistProvisioningOptions, databaseSha256: string) {
  const backupPath = resolve(options.backupParent, `${backupTimestamp()}_fibu-lohn-abstimmungsaufgabe`);
  if (existsSync(backupPath)) throw new Error(`SCHUTZABBRUCH: Backup-Ziel existiert bereits: ${backupPath}`);
  mkdirSync(resolve(backupPath, "prisma"), { recursive: true });
  mkdirSync(resolve(backupPath, "storage"), { recursive: true });
  const backupDatabase = resolve(backupPath, "prisma", basename(options.databasePath));
  copyFileSync(options.databasePath, backupDatabase);
  if (sha256File(backupDatabase) !== databaseSha256) throw new Error("SCHUTZABBRUCH: Datenbankkopie ist nicht bytegenau.");

  const campusBefore = storageManifest(options.campusStoragePath);
  const payrollBefore = storageManifest(options.payrollStoragePath);
  const campusBackup = resolve(backupPath, "storage", "ordo-campus");
  const payrollBackup = resolve(backupPath, "storage", "fibu-lohn");
  if (existsSync(options.campusStoragePath)) cpSync(options.campusStoragePath, campusBackup, { recursive: true });
  if (existsSync(options.payrollStoragePath)) cpSync(options.payrollStoragePath, payrollBackup, { recursive: true });
  if (JSON.stringify(campusBefore) !== JSON.stringify(storageManifest(campusBackup)) ||
      JSON.stringify(payrollBefore) !== JSON.stringify(storageManifest(payrollBackup))) {
    throw new Error("SCHUTZABBRUCH: Ein geschützter Speicher wurde nicht bytegenau gesichert.");
  }
  const manifest = {
    createdAt: timestamp(),
    sourceDatabase: options.databasePath,
    databaseSha256,
    campusStorage: campusBefore,
    payrollStorage: payrollBefore,
  };
  writeFileSync(resolve(backupPath, "backup-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { backupPath, backupDatabase };
}

async function integrity(prisma: PrismaClient) {
  const quick = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("PRAGMA quick_check");
  const foreignKeys = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("PRAGMA foreign_key_check");
  if (quick.length !== 1 || !Object.values(quick[0] ?? {}).includes("ok")) {
    throw new Error(`SCHUTZABBRUCH: quick_check fehlgeschlagen: ${JSON.stringify(quick)}`);
  }
  if (foreignKeys.length) throw new Error(`SCHUTZABBRUCH: foreign_key_check meldet Fehler: ${JSON.stringify(foreignKeys)}`);
  return { quickCheck: "ok", foreignKeyViolations: 0 } as const;
}

export async function provisionFibuLohnChecklist(options: ChecklistProvisioningOptions) {
  const databasePath = resolve(options.databasePath);
  if (!existsSync(databasePath) || !statSync(databasePath).isFile()) throw new Error(`SCHUTZABBRUCH: Datenbank fehlt: ${databasePath}`);
  assertNoSidecars(databasePath);
  const beforeSha256 = sha256File(databasePath);
  const prisma = new PrismaClient({ datasourceUrl: sqliteUrl(databasePath) });
  let backup: ReturnType<typeof createBackup> | null = null;
  try {
    const beforeIntegrity = await integrity(prisma);
    const before = {
      categories: await prisma.taskCategory.count(),
      standardTasks: await prisma.standardTask.count(),
      knowledge: await prisma.standardTaskKnowledge.count(),
      reconciliations: await prisma.payrollReconciliation.count(),
      snapshots: await prisma.payrollReconciliationItem.count(),
    };
    await prisma.$disconnect();
    assertNoSidecars(databasePath);
    if (sha256File(databasePath) !== beforeSha256) throw new Error("SCHUTZABBRUCH: Datenbank änderte sich während der Vorprüfung.");
    if (options.backupRequired) backup = createBackup(options, beforeSha256);
    await prisma.$connect();

    const actor = await prisma.user.findUnique({ where: { username: options.actorUsername }, include: { roles: true } });
    if (!actor?.active || !actor.roles.some(({ role }) => role === "KANZLEILEITUNG" || role === "STANDARDAUFGABEN_VERWALTEN")) {
      throw new Error(`SCHUTZABBRUCH: Audit-Benutzer ${options.actorUsername} fehlt oder ist nicht berechtigt.`);
    }
    const changes: string[] = [];
    const topicKeys = FIBU_LOHN_START_TOPICS.map(({ key }) => key);
    const task = await prisma.$transaction(async (tx) => {
      let category = await tx.taskCategory.findUnique({ where: { name: FIBU_LOHN_CHECKLIST_CATEGORY.name } });
      if (!category) {
        category = await tx.taskCategory.create({ data: FIBU_LOHN_CHECKLIST_CATEGORY });
        changes.push(`Kategorie ${category.name} angelegt`);
      }

      const keyCollision = await tx.standardTask.findFirst({
        where: { knowledgeKey: FIBU_LOHN_CHECKLIST_TASK.knowledgeKey, taskId: { not: FIBU_LOHN_CHECKLIST_TASK.taskId } },
      });
      if (keyCollision) throw new Error(`SCHUTZABBRUCH: Wissensschlüssel wird bereits von ${keyCollision.taskId} verwendet.`);
      let standardTask = await tx.standardTask.findUnique({ where: { taskId: FIBU_LOHN_CHECKLIST_TASK.taskId } });
      if (!standardTask) {
        standardTask = await tx.standardTask.create({ data: { ...FIBU_LOHN_CHECKLIST_TASK, categoryId: category.id } });
        await tx.standardTaskPlanningHistory.create({ data: {
          standardTaskId: standardTask.id,
          actorUserId: actor.id,
          actorNameSnapshot: actor.fullName,
          changedArea: "Bereitstellung",
          newValue: FIBU_LOHN_CHECKLIST_TASK.taskId,
        } });
        changes.push(`Standardaufgabe ${standardTask.taskId} angelegt`);
      } else if (standardTask.knowledgeKey !== FIBU_LOHN_CHECKLIST_TASK.knowledgeKey) {
        throw new Error(`SCHUTZABBRUCH: Vorhandene Aufgabe ${standardTask.taskId} besitzt einen unerwarteten Wissensschlüssel.`);
      }

      let knowledge = await tx.standardTaskKnowledge.findUnique({ where: { standardTaskId: standardTask.id } });
      if (!knowledge) {
        knowledge = await tx.standardTaskKnowledge.create({ data: { standardTaskId: standardTask.id, ...FIBU_LOHN_CHECKLIST_KNOWLEDGE } });
        await tx.standardTaskKnowledgeHistory.create({ data: {
          knowledgeId: knowledge.id,
          standardTaskId: standardTask.id,
          actorUserId: actor.id,
          actorNameSnapshot: actor.fullName,
          changedArea: "Wissen",
          description: "Künstliches Ordo-Campus-Wissen zur FiBu-Lohn-Abstimmung kontrolliert bereitgestellt.",
        } });
        changes.push("Ordo-Campus-Wissen angelegt");
      }

      const topics = await tx.payrollReconciliationTopic.findMany({ where: { key: { in: topicKeys } } });
      if (topics.length !== topicKeys.length) throw new Error("SCHUTZABBRUCH: Die sechs zentralen FiBu-Lohn-Themen sind nicht vollständig vorhanden.");
      for (const topic of topics) {
        if (topic.campusStandardTaskId === standardTask.id) continue;
        if (topic.campusStandardTaskId !== null) {
          throw new Error(`SCHUTZABBRUCH: Thema ${topic.key} besitzt bereits eine andere Campus-Verknüpfung.`);
        }
        await tx.payrollReconciliationTopic.update({ where: { id: topic.id }, data: { campusStandardTaskId: standardTask.id } });
        await tx.payrollReconciliationTopicHistory.create({ data: {
          topicId: topic.id,
          actorUserId: actor.id,
          actorNameSnapshot: actor.fullName,
          action: "Campus-Verknüpfung ergänzt",
          summary: `Thema „${topic.title}“ wurde verlustfrei mit ${standardTask.taskId} verknüpft.`,
          newValue: String(standardTask.id),
        } });
        changes.push(`Campus-Verknüpfung ${topic.key} ergänzt`);
      }
      return standardTask;
    });

    const afterIntegrity = await integrity(prisma);
    const after = {
      categories: await prisma.taskCategory.count(),
      standardTasks: await prisma.standardTask.count(),
      knowledge: await prisma.standardTaskKnowledge.count(),
      reconciliations: await prisma.payrollReconciliation.count(),
      snapshots: await prisma.payrollReconciliationItem.count(),
    };
    if (before.reconciliations !== after.reconciliations || before.snapshots !== after.snapshots) {
      throw new Error("SCHUTZABBRUCH: Bestehende Abstimmungen oder Snapshots wurden bei der zentralen Bereitstellung verändert.");
    }
    await prisma.$disconnect();
    assertNoSidecars(databasePath);
    const report = {
      environment: options.environmentLabel,
      databasePath,
      actor: { id: actor.id, username: actor.username, fullName: actor.fullName },
      backup,
      before: { sha256: beforeSha256, integrity: beforeIntegrity, ...before },
      changes,
      after: { sha256: sha256File(databasePath), integrity: afterIntegrity, ...after },
      task: { id: task.id, taskId: task.taskId, title: task.title },
      migrationRequired: false,
    };
    if (backup) writeFileSync(resolve(backup.backupPath, "bereitstellungsprotokoll.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    return report;
  } finally {
    await prisma.$disconnect();
  }
}

export async function takeOverFibuLohnChecklistTask(
  databasePath: string,
  clientNumber: string,
  calendarYear: number,
  month: number,
  actorName: string,
  standardTaskId: number,
) {
  process.env.DATABASE_URL = sqliteUrl(databasePath);
  const { addMissingStandardTasks } = await import("../lib/monthly-checklist-service.ts");
  const { prisma } = await import("../lib/prisma.ts");
  try {
    const period = await prisma.accountingPeriod.findFirst({
      where: { client: { clientNumber }, calendarYear, month, checklistType: "Monat" },
      include: { client: true },
    });
    if (!period) throw new Error(`SCHUTZABBRUCH: Monatscheckliste ${clientNumber} ${month}/${calendarYear} fehlt.`);
    if (!period.client.payrollPreparedByFirm) throw new Error(`SCHUTZABBRUCH: Mandant ${clientNumber} hat keinen Kanzleilohn.`);
    const result = await addMissingStandardTasks(period.id, actorName, [standardTaskId]);
    const reconciliation = await prisma.payrollReconciliation.findUnique({
      where: { accountingPeriodId: period.id },
      include: { items: { orderBy: { sortOrderSnapshot: "asc" } }, checklistTask: true },
    });
    if (!reconciliation || reconciliation.items.length !== FIBU_LOHN_START_TOPICS.length) {
      throw new Error("SCHUTZABBRUCH: FiBu-Lohn-Abstimmung oder sechs Themen-Snapshots fehlen nach der Übernahme.");
    }
    return {
      periodId: period.id,
      added: result.added,
      reconciliationId: reconciliation.id,
      checklistTaskId: reconciliation.checklistTaskId,
      topicKeys: reconciliation.items.map(({ topicKeySnapshot }) => topicKeySnapshot),
    };
  } finally {
    await prisma.$disconnect();
  }
}

function argument(name: string) {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  loadEnvConfig(PROJECT_ROOT, true);
  const configuredUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, "");
  const actorUsername = argument("--actor") ?? DEFAULT_ACTOR;
  const clientNumber = argument("--client-number") ?? "10008";
  const calendarYear = Number(argument("--year") ?? "2026");
  const month = Number(argument("--month") ?? "1");
  const campusStoragePath = resolve(PROJECT_ROOT, process.env.ORDO_CAMPUS_STORAGE_DIR ?? "storage/ordo-campus");
  const payrollStoragePath = resolve(PROJECT_ROOT, process.env.FIBU_LOHN_STORAGE_DIR ?? "storage/fibu-lohn");
  const environmentLabel = process.env.ORDO_ENVIRONMENT_LABEL ?? "Lokale Entwicklungsumgebung";
  console.log("FiBu-Lohn-Abstimmungsaufgabe – geschützte Bereitstellung");
  console.log(`Umgebung: ${environmentLabel}`);
  console.log(`DATABASE_URL: ${configuredUrl ?? "nicht gesetzt"}`);
  console.log(`Datenbankpfad: ${DEVELOPMENT_DATABASE}`);
  console.log(`Zielmandant/Periode: ${clientNumber}, ${month}/${calendarYear}`);
  console.log(`Campus-Speicher: ${campusStoragePath}`);
  console.log(`FiBu-Lohn-Speicher: ${payrollStoragePath}`);
  if (!process.argv.includes("--confirm-dev-db")) throw new Error("SCHUTZABBRUCH: Bewusste Freigabe --confirm-dev-db fehlt.");
  if (configuredUrl !== DEVELOPMENT_DATABASE_URL) throw new Error(`SCHUTZABBRUCH: Erwartet wird DATABASE_URL=${DEVELOPMENT_DATABASE_URL}.`);
  if (dirname(campusStoragePath) !== resolve(PROJECT_ROOT, "storage") || dirname(payrollStoragePath) !== resolve(PROJECT_ROOT, "storage")) {
    throw new Error("SCHUTZABBRUCH: Unerwarteter Speicherpfad.");
  }
  const report = await provisionFibuLohnChecklist({
    databasePath: DEVELOPMENT_DATABASE,
    actorUsername,
    environmentLabel,
    campusStoragePath,
    payrollStoragePath,
    backupParent: resolve(PROJECT_ROOT, "backups"),
    backupRequired: true,
  });
  const takeover = await takeOverFibuLohnChecklistTask(
    DEVELOPMENT_DATABASE,
    clientNumber,
    calendarYear,
    month,
    report.actor.fullName,
    report.task.id,
  );
  const verification = new PrismaClient({ datasourceUrl: sqliteUrl(DEVELOPMENT_DATABASE) });
  const finalIntegrity = await integrity(verification);
  await verification.$disconnect();
  const finalReport = { ...report, takeover, finalIntegrity, finalSha256: sha256File(DEVELOPMENT_DATABASE) };
  if (report.backup) writeFileSync(resolve(report.backup.backupPath, "abschlussprotokoll.json"), `${JSON.stringify(finalReport, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(finalReport, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
