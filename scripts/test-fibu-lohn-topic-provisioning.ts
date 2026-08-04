import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  FIBU_LOHN_COLLECTION_TOPIC_KEYS,
  FIBU_LOHN_START_TOPICS,
  FIBU_LOHN_TOPIC_STATUS,
  FIBU_LOHN_TOPIC_TYPE,
  FIBU_LOHN_TOPIC_VALID_FROM,
  fibuLohnTopicNotes,
} from "../lib/fibu-lohn-topic-catalog.ts";
import { provisionFibuLohnTopics } from "./provision-fibu-lohn-topics.ts";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceDatabase = resolve(projectRoot, "prisma", "dev.db");
const sourceCampusStorage = resolve(projectRoot, "storage", "ordo-campus");
const sourcePayrollStorage = resolve(projectRoot, "storage", "fibu-lohn");
const runRoot = resolve(projectRoot, "tmp", `fibu-lohn-topic-provisioning-${Date.now()}`);
const copyDatabase = resolve(runRoot, "prisma", "dev-copy.db");
const copyCampusStorage = resolve(runRoot, "storage", "ordo-campus");
const copyPayrollStorage = resolve(runRoot, "storage", "fibu-lohn");
const reportPath = resolve(runRoot, "kopientestbericht.json");
const sourceDatabaseInitialSha256 = fileSha256(sourceDatabase);

function fileSha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

for (const suffix of ["-wal", "-shm", "-journal"]) {
  assert.equal(existsSync(`${sourceDatabase}${suffix}`), false, `SQLite-Seitendatei vorhanden: ${suffix}`);
}
mkdirSync(resolve(runRoot, "prisma"), { recursive: true });
mkdirSync(resolve(runRoot, "storage"), { recursive: true });
copyFileSync(sourceDatabase, copyDatabase);
assert.equal(fileSha256(copyDatabase), fileSha256(sourceDatabase), "Die Datenbankkopie ist nicht bytegenau.");
if (existsSync(sourceCampusStorage)) cpSync(sourceCampusStorage, copyCampusStorage, { recursive: true });
if (existsSync(sourcePayrollStorage)) cpSync(sourcePayrollStorage, copyPayrollStorage, { recursive: true });

const options = {
  databasePath: copyDatabase,
  databaseLabel: "bytegenaue Kopie von prisma/dev.db",
  actorUsername: "klara.leitung",
  campusStoragePath: copyCampusStorage,
  payrollStoragePath: copyPayrollStorage,
  environmentLabel: "Isolierter Kopientest",
  backupParent: resolve(runRoot, "backups"),
  backupRequired: true,
};

const first = await provisionFibuLohnTopics(options);
assert.equal(first.after.topicCount, 6, "Nach dem ersten Lauf müssen genau sechs Themen vorhanden sein.");
assert.equal(first.after.activeStartTopicCount, 6, "Alle sechs Startthemen müssen aktiv sein.");
assert.equal(first.changes.length, 6, "Jeder stabile Themenschlüssel muss im Protokoll erscheinen.");
if (first.before.activeStartTopicCount === 0) {
  assert.equal(first.changes.filter((change) => change.action === "angelegt").length, 6, "Im leeren Kopienbestand müssen sechs Themen angelegt werden.");
} else {
  assert.equal(first.before.activeStartTopicCount, 6, "Der Kopienbestand darf nicht unerwartet teilweise provisioniert sein.");
  assert.equal(first.changes.every((change) => change.action === "unverändert erkannt"), true, "Ein vollständig provisionierter Kopienbestand muss bytegenau unverändert bleiben.");
  assert.equal(first.before.databaseSha256, first.after.databaseSha256, "Der erste Lauf gegen den vollständigen Kopienbestand muss bytegenau idempotent sein.");
}
assert.equal(first.existingReconciliationsAndSnapshotsUnchanged, true);
assert.equal(first.manualContentOverwritten, false);

const copyPrisma = new PrismaClient({ datasourceUrl: `file:${copyDatabase.replaceAll("\\", "/")}` });
const storedTopics = await copyPrisma.payrollReconciliationTopic.findMany({ orderBy: [{ sortOrder: "asc" }, { key: "asc" }] });
assert.equal(storedTopics.length, FIBU_LOHN_START_TOPICS.length);
for (const [index, expected] of FIBU_LOHN_START_TOPICS.entries()) {
  const stored = storedTopics[index];
  assert.equal(stored.key, expected.key);
  assert.equal(stored.title, expected.title);
  assert.equal(stored.shortDescription, expected.shortDescription);
  assert.equal(stored.reviewQuestion, expected.reviewQuestion);
  assert.equal(stored.sortOrder, (index + 1) * 10);
  assert.equal(stored.status, FIBU_LOHN_TOPIC_STATUS);
  assert.equal(stored.validFrom.toISOString(), FIBU_LOHN_TOPIC_VALID_FROM);
  assert.equal(stored.validUntil, null);
  assert.equal(stored.topicType, FIBU_LOHN_TOPIC_TYPE);
  assert.equal(stored.vehicleRelated, expected.vehicleRelated);
  assert.equal(stored.followUpAllowed, expected.followUpAllowed);
  assert.deepEqual(JSON.parse(stored.requiredStandardFields), expected.requiredStandardFields);
  assert.deepEqual(JSON.parse(stored.requiredDocumentTypes), expected.requiredDocumentTypes);
  assert.equal(stored.notes, fibuLohnTopicNotes(expected.followUpAllowed));
  assert.equal(FIBU_LOHN_COLLECTION_TOPIC_KEYS.includes(expected.key as never), expected.collectionAllowed);
}
assert.equal(storedTopics.filter((topic) => topic.vehicleRelated).length, 1);
assert.equal(storedTopics.find((topic) => topic.vehicleRelated)?.key, "FAHRZEUGE");
await copyPrisma.$disconnect();

const beforeSecondSha256 = fileSha256(copyDatabase);
const second = await provisionFibuLohnTopics(options);
assert.equal(second.changes.every((change) => change.action === "unverändert erkannt"), true, "Der zweite Lauf darf nichts ergänzen.");
assert.equal(second.before.databaseSha256, second.after.databaseSha256, "Der zweite Lauf muss bytegenau idempotent sein.");
assert.equal(fileSha256(copyDatabase), beforeSecondSha256, "Der zweite Lauf hat die Datenbankdatei verändert.");
assert.equal(fileSha256(sourceDatabase), sourceDatabaseInitialSha256, "Die echte dev.db wurde während des Kopientests verändert.");

process.env.DATABASE_URL = `file:${copyDatabase.replaceAll("\\", "/")}`;
Object.assign(process.env, { NODE_ENV: "test" });
const [{ createPayrollReconciliationInTransaction }, { prisma: applicationPrisma }] = await Promise.all([
  import("../lib/payroll-reconciliation-service.ts"),
  import("../lib/prisma.ts"),
]);
const verificationPrisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const period = await verificationPrisma.accountingPeriod.findFirst({
  where: {
    client: {
      payrollPreparedByFirm: true,
      payrollUser: { is: { active: true, roles: { some: { role: "LOHNSACHBEARBEITER" } } } },
    },
    payrollReconciliation: null,
    tasks: { some: {} },
  },
  include: { client: { include: { payrollUser: true } }, tasks: { orderBy: { id: "asc" } } },
  orderBy: { id: "asc" },
});
assert.ok(period?.client.payrollUser, "Auf der Kopie fehlt ein geeigneter künstlicher Kanzleilohn-Mandant.");
const checklistTask = period.tasks[0];
assert.ok(checklistTask, "Auf der Kopie fehlt eine geeignete Checklistenaufgabe für den Snapshot-Test.");
const payrollUser = period.client.payrollUser;
assert.ok(payrollUser);
const reconciliation = await verificationPrisma.$transaction((tx) => createPayrollReconciliationInTransaction(tx, {
  clientId: period.clientId,
  accountingYear: period.calendarYear,
  accountingMonth: period.month,
  payrollYear: 2099,
  payrollMonth: 12,
  accountingPeriodId: period.id,
  checklistTaskId: checklistTask.id,
  processorUserId: period.processorUserId,
  processorNameSnapshot: period.processorSnapshot,
  reviewerUserId: period.reviewerUserId,
  reviewerNameSnapshot: period.reviewerSnapshot,
  payrollUserId: payrollUser.id,
  payrollUserNameSnapshot: payrollUser.fullName,
}));
const snapshotItems = await verificationPrisma.payrollReconciliationItem.findMany({
  where: { reconciliationId: reconciliation.id },
  orderBy: [{ sortOrderSnapshot: "asc" }, { topicKeySnapshot: "asc" }],
});
assert.equal(snapshotItems.length, 6, "Eine neue Abstimmung muss genau sechs Themen-Snapshots erhalten.");
assert.deepEqual(snapshotItems.map((item) => item.topicKeySnapshot), FIBU_LOHN_START_TOPICS.map((topic) => topic.key));
for (const [index, item] of snapshotItems.entries()) {
  const expected = FIBU_LOHN_START_TOPICS[index];
  assert.equal(item.topicTitleSnapshot, expected.title);
  assert.equal(item.vehicleRelatedSnapshot, expected.vehicleRelated);
  assert.deepEqual(JSON.parse(item.requiredFieldsSnapshot), expected.requiredStandardFields);
  assert.deepEqual(JSON.parse(item.requiredDocumentsSnapshot), expected.requiredDocumentTypes);
}
await verificationPrisma.$disconnect();
await applicationPrisma.$disconnect();

const testReport = {
  completedAt: new Date().toISOString(),
  runRoot: relative(projectRoot, runRoot).replaceAll("\\", "/"),
  sourceDatabaseSha256: sourceDatabaseInitialSha256,
  copiedDatabaseInitialSha256: first.before.databaseSha256,
  firstRun: first,
  secondRun: second,
  newReconciliation: {
    id: reconciliation.id,
    snapshotCount: snapshotItems.length,
    topicKeys: snapshotItems.map((item) => item.topicKeySnapshot),
  },
  result: "Kopientest, Idempotenz und Snapshot-Erzeugung erfolgreich",
};
writeFileSync(reportPath, `${JSON.stringify(testReport, null, 2)}\n`, "utf8");
console.log(JSON.stringify(testReport, null, 2));
