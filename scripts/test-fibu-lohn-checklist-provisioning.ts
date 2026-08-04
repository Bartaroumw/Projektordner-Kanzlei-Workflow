import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { FIBU_LOHN_START_TOPICS } from "../lib/fibu-lohn-topic-catalog.ts";
import {
  provisionFibuLohnChecklist,
  takeOverFibuLohnChecklistTask,
} from "./provision-fibu-lohn-checklist.ts";

const ROOT = resolve(import.meta.dirname, "..");
const SOURCE = resolve(ROOT, "prisma", "dev.db");
const TMP = resolve(ROOT, "tmp");
mkdirSync(TMP, { recursive: true });
const workingDirectory = mkdtempSync(resolve(TMP, "fibu-lohn-checklist-copy-"));
const COPY = resolve(workingDirectory, "dev-copy.db");
copyFileSync(SOURCE, COPY);

function sha(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function url(path: string) {
  return `file:${path.replaceAll("\\", "/")}`;
}

const sourceSha256 = sha(SOURCE);
if (sha(COPY) !== sourceSha256) throw new Error("Kopientest abgebrochen: Ausgangskopie ist nicht bytegenau.");
const beforeClient = new PrismaClient({ datasourceUrl: url(COPY) });
const targetPeriod = await beforeClient.accountingPeriod.findFirstOrThrow({
  where: { client: { clientNumber: "10008" }, calendarYear: 2026, month: 1, checklistType: "Monat" },
});
const targetReconciliationBefore = await beforeClient.payrollReconciliation.findUnique({
  where: { accountingPeriodId: targetPeriod.id },
});
const expectedAddedTasks = targetReconciliationBefore ? 0 : 1;
const historicBefore = await beforeClient.payrollReconciliation.findMany({
  where: { accountingPeriodId: { not: targetPeriod.id } },
  include: { items: true },
  orderBy: { id: "asc" },
});
const taskCountBefore = await beforeClient.checklistTask.count({ where: { periodId: targetPeriod.id } });
await beforeClient.$disconnect();

const options = {
  databasePath: COPY,
  actorUsername: "klara.leitung",
  environmentLabel: "Bytegenaue Kopie für FiBu-Lohn-Abstimmungsaufgabe",
  campusStoragePath: resolve(workingDirectory, "storage", "ordo-campus"),
  payrollStoragePath: resolve(workingDirectory, "storage", "fibu-lohn"),
  backupParent: resolve(workingDirectory, "backups"),
  backupRequired: false,
};
const firstProvisioning = await provisionFibuLohnChecklist(options);
const firstTakeover = await takeOverFibuLohnChecklistTask(
  COPY,
  "10008",
  2026,
  1,
  firstProvisioning.actor.fullName,
  firstProvisioning.task.id,
);
const afterFirstSha256 = sha(COPY);

const secondProvisioning = await provisionFibuLohnChecklist(options);
const secondTakeover = await takeOverFibuLohnChecklistTask(
  COPY,
  "10008",
  2026,
  1,
  secondProvisioning.actor.fullName,
  secondProvisioning.task.id,
);
const afterSecondSha256 = sha(COPY);

const verification = new PrismaClient({ datasourceUrl: url(COPY) });
const reconciliation = await verification.payrollReconciliation.findUniqueOrThrow({
  where: { accountingPeriodId: targetPeriod.id },
  include: { items: { orderBy: { sortOrderSnapshot: "asc" } }, checklistTask: true, client: true },
});
const historicAfter = await verification.payrollReconciliation.findMany({
  where: { accountingPeriodId: { not: targetPeriod.id } },
  include: { items: true },
  orderBy: { id: "asc" },
});
const taskCountAfter = await verification.checklistTask.count({ where: { periodId: targetPeriod.id } });
const centralTask = await verification.standardTask.findUniqueOrThrow({
  where: { taskId: "MON-FIBU-LOHN-001" },
  include: { category: true, campusKnowledge: true, payrollTopics: { orderBy: { sortOrder: "asc" } } },
});
const quick = await verification.$queryRawUnsafe<Array<Record<string, unknown>>>("PRAGMA quick_check");
const foreignKeys = await verification.$queryRawUnsafe<Array<Record<string, unknown>>>("PRAGMA foreign_key_check");
await verification.$disconnect();

const expectedKeys = FIBU_LOHN_START_TOPICS.map(({ key }) => key);
const actualKeys = reconciliation.items.map(({ topicKeySnapshot }) => topicKeySnapshot);
if (firstTakeover.added !== expectedAddedTasks || secondTakeover.added !== 0) throw new Error("Kopientest: Übernahme ist nicht idempotent.");
if (afterFirstSha256 !== afterSecondSha256) throw new Error("Kopientest: Zweite Ausführung veränderte die Datenbankdatei.");
if (sha(SOURCE) !== sourceSha256) throw new Error("Kopientest: Die echte dev.db wurde verändert.");
if (reconciliation.client.clientNumber !== "10008" || reconciliation.items.length !== 6) throw new Error("Kopientest: Zielabstimmung ist unvollständig.");
if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) throw new Error("Kopientest: Themen-Snapshots oder Reihenfolge weichen ab.");
if (centralTask.category.name !== "FiBu-Lohn-Abstimmung" || centralTask.campusKnowledge?.status !== "Aktiv") {
  throw new Error("Kopientest: Kategorie oder Campus-Wissen fehlt.");
}
if (centralTask.payrollTopics.length !== 6) throw new Error("Kopientest: Nicht genau sechs Themen sind mit der Campus-Aufgabe verknüpft.");
if (taskCountAfter !== taskCountBefore + expectedAddedTasks) throw new Error("Kopientest: Die Anzahl der Checklistenaufgaben weicht vom erwarteten idempotenten Ergebnis ab.");
if (JSON.stringify(historicBefore) !== JSON.stringify(historicAfter)) throw new Error("Kopientest: Historische Abstimmungen wurden verändert.");
if (quick.length !== 1 || !Object.values(quick[0] ?? {}).includes("ok") || foreignKeys.length) {
  throw new Error("Kopientest: SQLite-Integritätsprüfung fehlgeschlagen.");
}

const report = {
  workingDirectory,
  sourceDatabase: SOURCE,
  copyDatabase: COPY,
  sourceSha256,
  afterFirstSha256,
  afterSecondSha256,
  firstProvisioning,
  firstTakeover,
  secondProvisioning,
  secondTakeover,
  verification: {
    clientNumber: reconciliation.client.clientNumber,
    periodId: targetPeriod.id,
    checklistTaskId: reconciliation.checklistTaskId,
    reconciliationId: reconciliation.id,
    topicKeys: actualKeys,
    taskCountBefore,
    taskCountAfter,
    expectedAddedTasks,
    historicReconciliationsUnchanged: true,
    secondRunByteUnchanged: true,
    quickCheck: "ok",
    foreignKeyViolations: 0,
  },
};
writeFileSync(resolve(workingDirectory, "kopientest-protokoll.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
