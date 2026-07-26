ALTER TABLE "AccountingPeriod" ADD COLUMN "processorSnapshot" TEXT;
ALTER TABLE "AccountingPeriod" ADD COLUMN "reviewerSnapshot" TEXT;
ALTER TABLE "AccountingPeriod" ADD COLUMN "currentActorInitials" TEXT;
ALTER TABLE "AccountingPeriod" ADD COLUMN "submittedForReviewAt" DATETIME;
ALTER TABLE "AccountingPeriod" ADD COLUMN "reviewStartedAt" DATETIME;
ALTER TABLE "AccountingPeriod" ADD COLUMN "returnedAt" DATETIME;
ALTER TABLE "AccountingPeriod" ADD COLUMN "lastReviewAt" DATETIME;
ALTER TABLE "AccountingPeriod" ADD COLUMN "lastStatusChangedAt" DATETIME;

UPDATE "AccountingPeriod"
SET "processorSnapshot" = (SELECT "processor" FROM "Client" WHERE "Client"."id" = "AccountingPeriod"."clientId"),
    "reviewerSnapshot" = (SELECT "reviewer" FROM "Client" WHERE "Client"."id" = "AccountingPeriod"."clientId"),
    "lastStatusChangedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "ChecklistTask" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'Nicht geprüft';
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewerInitials" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewedAt" DATETIME;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueCreatedAt" DATETIME;
ALTER TABLE "ChecklistTask" ADD COLUMN "processorResponse" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "respondedBy" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "respondedAt" DATETIME;
ALTER TABLE "ChecklistTask" ADD COLUMN "finalReviewedAt" DATETIME;

CREATE TABLE "WorkflowHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "periodId" INTEGER NOT NULL,
  "checklistTaskId" INTEGER,
  "eventType" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorInitials" TEXT,
  "description" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  CONSTRAINT "WorkflowHistory_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WorkflowHistory_checklistTaskId_fkey" FOREIGN KEY ("checklistTaskId") REFERENCES "ChecklistTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "WorkflowHistory_periodId_occurredAt_idx" ON "WorkflowHistory"("periodId", "occurredAt");
CREATE INDEX "WorkflowHistory_checklistTaskId_occurredAt_idx" ON "WorkflowHistory"("checklistTaskId", "occurredAt");

INSERT INTO "WorkflowHistory" ("periodId", "eventType", "occurredAt", "description", "newValue")
SELECT "id", 'Periode erzeugt', "createdAt", 'Monatscheckliste wurde erzeugt.', 'Offen'
FROM "AccountingPeriod";
