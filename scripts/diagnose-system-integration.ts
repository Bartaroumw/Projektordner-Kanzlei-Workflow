import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.ts";

const REQUIRED_DATABASE_URL = "file:./system-integration.db";
if (process.env.DATABASE_URL !== REQUIRED_DATABASE_URL) {
  throw new Error(`SCHUTZABBRUCH: Die Systemdiagnose ist nur für ${REQUIRED_DATABASE_URL} freigegeben.`);
}
const campusRoot = resolve(process.env.ORDO_CAMPUS_STORAGE_DIR ?? "");
const payrollRoot = resolve(process.env.FIBU_LOHN_STORAGE_DIR ?? "");
const profileImageRoot = resolve(process.env.PROFILE_IMAGE_STORAGE_DIR ?? "");
if (!campusRoot.replaceAll("\\", "/").endsWith("/tmp/system-integration-storage/ordo-campus")) {
  throw new Error("SCHUTZABBRUCH: Falscher Campus-Speicher für die Systemdiagnose.");
}
if (!payrollRoot.replaceAll("\\", "/").endsWith("/tmp/system-integration-storage/fibu-lohn")) {
  throw new Error("SCHUTZABBRUCH: Falscher FiBu-Lohn-Speicher für die Systemdiagnose.");
}
if (!profileImageRoot.replaceAll("\\", "/").endsWith("/tmp/system-integration-storage/profile-images")) {
  throw new Error("SCHUTZABBRUCH: Falscher Profilbildspeicher für die Systemdiagnose.");
}

async function storedFiles(root: string) {
  try {
    return (await readdir(root, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

const [
  users,
  clients,
  periods,
  annualChecklists,
  checklistTasks,
  annualTasks,
  campusAttachments,
  payrollDocuments,
  payrollPositions,
  payrollReconciliations,
  vehicles,
  migrations,
  profileImages,
] = await Promise.all([
  prisma.user.findMany({ include: { roles: true } }),
  prisma.client.findMany(),
  prisma.accountingPeriod.findMany(),
  prisma.annualChecklist.findMany(),
  prisma.checklistTask.findMany(),
  prisma.annualChecklistTask.findMany(),
  prisma.standardTaskKnowledgeAttachment.findMany({ select: { storageKey: true } }),
  prisma.payrollDocumentReference.findMany({ select: { storageKey: true } }),
  prisma.payrollReconciliationPosition.findMany({
    include: {
      reconciliationItem: { select: { topicKeySnapshot: true } },
      documents: { where: { status: "Aktiv" }, select: { fileExtension: true } },
    },
  }),
  prisma.payrollReconciliation.findMany({
    include: { questions: true, client: true, accountingPeriod: true },
  }),
  prisma.clientVehicle.findMany({ include: { changes: { include: { reconciliationItem: { include: { reconciliation: true } } } } } }),
  prisma.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>(
    'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations" ORDER BY "started_at"',
  ),
  prisma.userProfileImage.findMany({ select: { storedFileName: true } }),
]);

const userById = new Map(users.map((user) => [user.id, user]));
const rolesOf = (id: number | null) => new Set(userById.get(id ?? -1)?.roles.map((role) => role.role) ?? []);
const hasAnyRole = (id: number | null, allowed: string[]) => allowed.some((role) => rolesOf(id).has(role));
const duplicatePeriods = Object.entries(
  periods.reduce<Record<string, number>>((result, period) => {
    const key = `${period.clientId}/${period.calendarYear}/${period.month}/${period.checklistType}`;
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {}),
).filter(([, count]) => count > 1);
const duplicateMonthlySnapshots = Object.entries(
  checklistTasks.reduce<Record<string, number>>((result, task) => {
    if (task.standardTaskId && task.origin === "Standardaufgabe") {
      const key = `${task.periodId}/${task.standardTaskId}`;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }, {}),
).filter(([, count]) => count > 1);
const duplicateAnnualSnapshots = Object.entries(
  annualTasks.reduce<Record<string, number>>((result, task) => {
    if (task.standardTaskId && task.origin === "Standardaufgabe") {
      const key = `${task.annualChecklistId}/${task.standardTaskId}`;
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }, {}),
).filter(([, count]) => count > 1);
const invalidClientRoles = clients.filter((client) =>
  !client.processorUserId ||
  !client.reviewerUserId ||
  !client.managementUserId ||
  !hasAnyRole(client.processorUserId, ["MITARBEITER", "PRUEFER", "KANZLEILEITUNG"]) ||
  !hasAnyRole(client.reviewerUserId, ["PRUEFER", "KANZLEILEITUNG"]) ||
  !hasAnyRole(client.managementUserId, ["KANZLEILEITUNG"]) ||
  (client.payrollPreparedByFirm &&
    (!client.payrollUserId || !hasAnyRole(client.payrollUserId, ["LOHNSACHBEARBEITER"]))),
);
const inactiveAssignments = clients.filter((client) =>
  [client.processorUserId, client.reviewerUserId, client.managementUserId, client.payrollUserId]
    .filter((id): id is number => id !== null)
    .some((id) => !userById.get(id)?.active),
);
const invalidPeriodStates = periods.filter((period) =>
  (period.processingStatus === "Abgeschlossen" && !period.completedAt) ||
  (period.processingStatus !== "Abgeschlossen" && Boolean(period.completedAt)),
);
const invalidAnnualStates = annualChecklists.filter((checklist) =>
  (checklist.status === "Freigegeben" && !checklist.releasedAt) ||
  (checklist.status !== "Freigegeben" && Boolean(checklist.releasedAt)),
);
const openReviewIssueOnClosedChecklist = checklistTasks.filter((task) => {
  const period = periods.find((item) => item.id === task.periodId);
  return period?.processingStatus === "Abgeschlossen" && task.reviewIssueStatus === "Offen";
});
const automaticallyReviewedTasks = checklistTasks.filter(
  (task) => task.reviewStatus === "In Ordnung" && (!task.reviewedAt || !task.reviewerInitials),
);
const completedPayrollWithOpenQuestion = payrollReconciliations.filter(
  (item) => item.payrollStatus === "Erledigt" && item.questions.some((question) => !question.completedAt),
);
const wrongPayrollAssignments = payrollReconciliations.filter(
  (item) =>
    !item.client.payrollPreparedByFirm ||
    !item.client.payrollUserId ||
    item.payrollUserId !== item.client.payrollUserId ||
    item.accountingPeriod.clientId !== item.clientId,
);
const collectionTopics = new Set(["ARBEITNEHMER_VORTEILE", "REISEKOSTEN", "GESCHENKE_NICHTARBEITNEHMER", "KSK"]);
const invalidPayrollPositions = payrollPositions.filter((position) =>
  (position.positionType === "Sammelposition" && !collectionTopics.has(position.reconciliationItem.topicKeySnapshot)) ||
  position.caseCount < 1 ||
  (position.positionType === "Sammelposition" && position.caseCount < 2),
);
const completePositionsWithoutRequiredList = payrollPositions.filter((position) =>
  position.status === "Vollständig" &&
  Boolean(position.requiredListType) &&
  !position.documents.some((document) => ["PDF", "XLSX"].includes(document.fileExtension)),
);
const wrongVehicleReferences = vehicles.flatMap((vehicle) =>
  vehicle.changes.filter(
    (change) =>
      change.reconciliationItem &&
      change.reconciliationItem.reconciliation.clientId !== vehicle.clientId,
  ),
);
const campusStored = await storedFiles(campusRoot);
const payrollStored = await storedFiles(payrollRoot);
const profileImageStored = await storedFiles(profileImageRoot);
const campusReferences = new Set(campusAttachments.map((item) => item.storageKey));
const payrollReferences = new Set(payrollDocuments.map((item) => item.storageKey));
const profileImageReferences = new Set(profileImages.map((item) => item.storedFileName));
const missingCampusFiles = campusAttachments.filter((item) => !campusStored.includes(item.storageKey));
const orphanCampusFiles = campusStored.filter((name) => !campusReferences.has(name));
const missingPayrollFiles = payrollDocuments.filter((item) => !payrollStored.includes(item.storageKey));
const orphanPayrollFiles = payrollStored.filter((name) => !payrollReferences.has(name));
const missingProfileImages = profileImages.filter((item) => !profileImageStored.includes(item.storedFileName));
const orphanProfileImages = profileImageStored.filter((name) => !profileImageReferences.has(name));
const incompleteMigrations = migrations.filter((migration) => !migration.finished_at || migration.rolled_back_at);

const findings = {
  duplicatePeriods: duplicatePeriods.length,
  duplicateMonthlySnapshots: duplicateMonthlySnapshots.length,
  duplicateAnnualSnapshots: duplicateAnnualSnapshots.length,
  invalidClientRoles: invalidClientRoles.map((client) => client.clientNumber),
  inactiveAssignments: inactiveAssignments.map((client) => client.clientNumber),
  invalidPeriodStates: invalidPeriodStates.map((period) => period.id),
  invalidAnnualStates: invalidAnnualStates.map((checklist) => checklist.id),
  openReviewIssueOnClosedChecklist: openReviewIssueOnClosedChecklist.map((task) => task.id),
  automaticallyReviewedTasks: automaticallyReviewedTasks.map((task) => task.id),
  completedPayrollWithOpenQuestion: completedPayrollWithOpenQuestion.map((item) => item.id),
  wrongPayrollAssignments: wrongPayrollAssignments.map((item) => item.id),
  invalidPayrollPositions: invalidPayrollPositions.map((item) => item.id),
  completePositionsWithoutRequiredList: completePositionsWithoutRequiredList.map((item) => item.id),
  wrongVehicleReferences: wrongVehicleReferences.map((item) => item.id),
  missingCampusFiles: missingCampusFiles.map((item) => item.storageKey),
  orphanCampusFiles,
  missingPayrollFiles: missingPayrollFiles.map((item) => item.storageKey),
  orphanPayrollFiles,
  missingProfileImages: missingProfileImages.map((item) => item.storedFileName),
  orphanProfileImages,
  incompleteMigrations: incompleteMigrations.map((migration) => migration.migration_name),
};
const summary = {
  environment: "Systemintegration",
  migrations: migrations.map((migration) => migration.migration_name),
  counts: {
    users: users.length,
    clients: clients.length,
    monthlyChecklists: periods.length,
    monthlyTasks: checklistTasks.length,
    annualChecklists: annualChecklists.length,
    annualTasks: annualTasks.length,
    campusAttachments: campusAttachments.length,
    payrollReconciliations: payrollReconciliations.length,
    payrollPositions: payrollPositions.length,
    payrollDocuments: payrollDocuments.length,
    profileImages: profileImages.length,
    vehicles: vehicles.length,
  },
  findings,
};
console.log(JSON.stringify(summary, null, 2));

let findingCount = 0;
for (const value of Object.values(findings)) {
  findingCount += typeof value === "number" ? value : value.length;
}
await prisma.$disconnect();
if (findingCount > 0) {
  throw new Error(`Die Systemintegrationsdiagnose hat ${findingCount} Inkonsistenz(en) gefunden.`);
}
