import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../lib/prisma.ts";
import { parseExecutionMonths } from "../lib/task-execution-planning.ts";

type CountRow = { count: bigint };

async function countSql(sql: TemplateStringsArray) {
  const rows = await prisma.$queryRawUnsafe<CountRow[]>(sql.join(""));
  return Number(rows[0]?.count ?? 0);
}

async function listStoredFiles(root: string) {
  try {
    return (await readdir(root, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

const storageRoot = resolve(
  process.env.ORDO_CAMPUS_STORAGE_DIR ?? "storage/ordo-campus",
);

const [
  orphanChecklistTasks,
  orphanKnowledgeLinks,
  orphanKnowledgeHistory,
  orphanAnnualHistory,
  duplicateChecklistSnapshots,
  periodsWithoutRoleReferences,
  annualChecklistsWithoutRoleReferences,
  attachments,
  standardTasks,
] = await Promise.all([
  countSql`SELECT COUNT(*) AS count
    FROM ChecklistTask task
    LEFT JOIN AccountingPeriod period ON period.id = task.periodId
    WHERE period.id IS NULL`,
  countSql`SELECT COUNT(*) AS count
    FROM StandardTaskKnowledgeLink link
    LEFT JOIN StandardTaskKnowledge knowledge ON knowledge.id = link.knowledgeId
    WHERE knowledge.id IS NULL`,
  countSql`SELECT COUNT(*) AS count
    FROM StandardTaskKnowledgeHistory history
    LEFT JOIN StandardTask task ON task.id = history.standardTaskId
    LEFT JOIN User actor ON actor.id = history.actorUserId
    WHERE task.id IS NULL OR actor.id IS NULL`,
  countSql`SELECT COUNT(*) AS count
    FROM AnnualWorkflowHistory history
    LEFT JOIN AnnualChecklist checklist ON checklist.id = history.annualChecklistId
    WHERE checklist.id IS NULL`,
  countSql`SELECT COUNT(*) AS count FROM (
    SELECT periodId, standardTaskId
    FROM ChecklistTask
    WHERE standardTaskId IS NOT NULL
    GROUP BY periodId, standardTaskId
    HAVING COUNT(*) > 1
  ) duplicates`,
  countSql`SELECT COUNT(*) AS count
    FROM AccountingPeriod
    WHERE processorUserId IS NULL OR reviewerUserId IS NULL OR managementUserId IS NULL`,
  countSql`SELECT COUNT(*) AS count
    FROM AnnualChecklist checklist
    LEFT JOIN User processor ON processor.id = checklist.processorUserId
    LEFT JOIN User reviewer ON reviewer.id = checklist.reviewerUserId
    LEFT JOIN User management ON management.id = checklist.managementUserId
    WHERE processor.id IS NULL OR reviewer.id IS NULL OR management.id IS NULL`,
  prisma.standardTaskKnowledgeAttachment.findMany({
    select: { storageKey: true },
  }),
  prisma.standardTask.findMany({
    select: {
      id: true,
      taskId: true,
      checklistType: true,
      executionMonths: true,
    },
  }),
]);

const invalidExecutionMonths = standardTasks.filter((task) => {
  if (task.checklistType === "Jahresabschluss") {
    return false;
  }
  try {
    return parseExecutionMonths(task.executionMonths).some(
      (month) => month < 1 || month > 12,
    );
  } catch {
    return true;
  }
});

const storedFiles = await listStoredFiles(storageRoot);
const referencedFiles = new Set(attachments.map((attachment) => attachment.storageKey));
const missingAttachmentFiles = attachments.filter(
  (attachment) => !storedFiles.includes(attachment.storageKey),
);
const filesWithoutDatabaseRecord = storedFiles.filter(
  (file) => !referencedFiles.has(file),
);

const result = {
  database: {
    users: await prisma.user.count(),
    clients: await prisma.client.count(),
    standardTasks: standardTasks.length,
    periods: await prisma.accountingPeriod.count(),
    checklistTasks: await prisma.checklistTask.count(),
    annualChecklists: await prisma.annualChecklist.count(),
    annualChecklistTasks: await prisma.annualChecklistTask.count(),
    workflowHistoryEntries:
      (await prisma.workflowHistory.count()) +
      (await prisma.annualWorkflowHistory.count()),
  },
  consistency: {
    orphanChecklistTasks,
    orphanKnowledgeLinks,
    orphanKnowledgeHistory,
    orphanAnnualHistory,
    duplicateChecklistSnapshots,
    periodsWithoutRoleReferences,
    annualChecklistsWithoutRoleReferences,
    invalidExecutionMonths: invalidExecutionMonths.map((task) => task.taskId),
    missingAttachmentFiles: missingAttachmentFiles.map(
      (attachment) => attachment.storageKey,
    ),
    filesWithoutDatabaseRecord,
  },
};

console.log(JSON.stringify(result, null, 2));

let findingCount = 0;
for (const finding of Object.values(result.consistency)) {
  findingCount += Array.isArray(finding) ? finding.length : finding;
}

await prisma.$disconnect();

if (findingCount > 0) {
  process.exitCode = 1;
}
