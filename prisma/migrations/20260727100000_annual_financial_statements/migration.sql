CREATE TABLE "AnnualChecklist" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "fiscalYear" INTEGER NOT NULL,
  "closingDate" DATETIME NOT NULL,
  "legalFormSnapshot" TEXT NOT NULL,
  "profitDeterminationSnapshot" TEXT NOT NULL,
  "processorUserId" INTEGER NOT NULL,
  "reviewerUserId" INTEGER NOT NULL,
  "managementUserId" INTEGER NOT NULL,
  "processorNameSnapshot" TEXT NOT NULL,
  "reviewerNameSnapshot" TEXT NOT NULL,
  "managementNameSnapshot" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Offen',
  "generalNote" TEXT,
  "submittedForReviewAt" DATETIME,
  "reviewStartedAt" DATETIME,
  "returnedAt" DATETIME,
  "professionallyCompletedAt" DATETIME,
  "submittedForReleaseAt" DATETIME,
  "releasedAt" DATETIME,
  "releaseUserId" INTEGER,
  "releaseNameSnapshot" TEXT,
  "releaseNote" TEXT,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AnnualChecklist_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklist_processorUserId_fkey" FOREIGN KEY ("processorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklist_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklist_managementUserId_fkey" FOREIGN KEY ("managementUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklist_releaseUserId_fkey" FOREIGN KEY ("releaseUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnnualChecklist_clientId_fiscalYear_key" ON "AnnualChecklist"("clientId", "fiscalYear");
CREATE INDEX "AnnualChecklist_fiscalYear_status_idx" ON "AnnualChecklist"("fiscalYear", "status");
CREATE INDEX "AnnualChecklist_processorUserId_idx" ON "AnnualChecklist"("processorUserId");
CREATE INDEX "AnnualChecklist_reviewerUserId_idx" ON "AnnualChecklist"("reviewerUserId");
CREATE INDEX "AnnualChecklist_managementUserId_idx" ON "AnnualChecklist"("managementUserId");

CREATE TABLE "CustomAnnualTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "validFromYear" INTEGER NOT NULL,
  "validUntilYear" INTEGER,
  "mandatory" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CustomAnnualTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "CustomAnnualTask_clientId_active_validFromYear_idx" ON "CustomAnnualTask"("clientId", "active", "validFromYear");

CREATE TABLE "AnnualChecklistTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "annualChecklistId" INTEGER NOT NULL,
  "standardTaskId" INTEGER,
  "customAnnualTaskId" INTEGER,
  "sourceMonthlyTaskId" INTEGER,
  "createdByUserId" INTEGER,
  "taskIdSnapshot" TEXT NOT NULL,
  "categorySnapshot" TEXT NOT NULL,
  "categorySortOrder" INTEGER NOT NULL DEFAULT 0,
  "titleSnapshot" TEXT NOT NULL,
  "workInstructionSnapshot" TEXT,
  "reviewInstructionSnapshot" TEXT,
  "mandatorySnapshot" BOOLEAN NOT NULL DEFAULT false,
  "sortOrderSnapshot" INTEGER NOT NULL DEFAULT 0,
  "professionalVersionSnapshot" TEXT,
  "origin" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Offen',
  "processingNote" TEXT,
  "notApplicableReason" TEXT,
  "processedByName" TEXT,
  "processedAt" DATETIME,
  "reviewStatus" TEXT NOT NULL DEFAULT 'Nicht geprüft',
  "reviewNote" TEXT,
  "reviewedByName" TEXT,
  "reviewedAt" DATETIME,
  "reviewIssueCreatedAt" DATETIME,
  "processorResponse" TEXT,
  "respondedByName" TEXT,
  "respondedAt" DATETIME,
  "managementNote" TEXT,
  "sourceMonthLabel" TEXT,
  "sourceNoteSnapshot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AnnualChecklistTask_annualChecklistId_fkey" FOREIGN KEY ("annualChecklistId") REFERENCES "AnnualChecklist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklistTask_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklistTask_customAnnualTaskId_fkey" FOREIGN KEY ("customAnnualTaskId") REFERENCES "CustomAnnualTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklistTask_sourceMonthlyTaskId_fkey" FOREIGN KEY ("sourceMonthlyTaskId") REFERENCES "ChecklistTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AnnualChecklistTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AnnualChecklistTask_annualChecklistId_categorySortOrder_sortOrderSnapshot_idx" ON "AnnualChecklistTask"("annualChecklistId", "categorySortOrder", "sortOrderSnapshot");
CREATE INDEX "AnnualChecklistTask_standardTaskId_idx" ON "AnnualChecklistTask"("standardTaskId");
CREATE INDEX "AnnualChecklistTask_customAnnualTaskId_idx" ON "AnnualChecklistTask"("customAnnualTaskId");
CREATE INDEX "AnnualChecklistTask_sourceMonthlyTaskId_idx" ON "AnnualChecklistTask"("sourceMonthlyTaskId");

CREATE TABLE "AnnualWorkflowHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "annualChecklistId" INTEGER NOT NULL,
  "annualChecklistTaskId" INTEGER,
  "eventType" TEXT NOT NULL,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorUserId" INTEGER,
  "actorNameSnapshot" TEXT NOT NULL,
  "actorRoleSnapshot" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "reason" TEXT,
  CONSTRAINT "AnnualWorkflowHistory_annualChecklistId_fkey" FOREIGN KEY ("annualChecklistId") REFERENCES "AnnualChecklist" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualWorkflowHistory_annualChecklistTaskId_fkey" FOREIGN KEY ("annualChecklistTaskId") REFERENCES "AnnualChecklistTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AnnualWorkflowHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AnnualWorkflowHistory_annualChecklistId_occurredAt_idx" ON "AnnualWorkflowHistory"("annualChecklistId", "occurredAt");
CREATE INDEX "AnnualWorkflowHistory_annualChecklistTaskId_occurredAt_idx" ON "AnnualWorkflowHistory"("annualChecklistTaskId", "occurredAt");
CREATE INDEX "AnnualWorkflowHistory_actorUserId_idx" ON "AnnualWorkflowHistory"("actorUserId");
