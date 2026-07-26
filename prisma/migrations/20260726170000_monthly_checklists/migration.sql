CREATE TABLE "AccountingPeriod" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "calendarYear" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "checklistType" TEXT NOT NULL DEFAULT 'Monat',
  "processingStatus" TEXT NOT NULL DEFAULT 'Offen',
  "generalNote" TEXT,
  "checklistCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "profileLegalFormGroup" TEXT NOT NULL,
  "profileProfitDeterminationMethod" TEXT NOT NULL,
  "profileHasCashRegister" BOOLEAN NOT NULL,
  "profileHasPayroll" BOOLEAN NOT NULL,
  "profileHasFixedAssets" BOOLEAN NOT NULL,
  "profileHasReceivablesPayables" BOOLEAN NOT NULL,
  "profileHasLoans" BOOLEAN NOT NULL,
  "profileSubjectToVat" BOOLEAN NOT NULL,
  "profileHasPermanentExtension" BOOLEAN NOT NULL,
  CONSTRAINT "AccountingPeriod_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AccountingPeriod_clientId_calendarYear_month_checklistType_key" ON "AccountingPeriod"("clientId", "calendarYear", "month", "checklistType");
CREATE INDEX "AccountingPeriod_calendarYear_month_processingStatus_idx" ON "AccountingPeriod"("calendarYear", "month", "processingStatus");
CREATE INDEX "AccountingPeriod_clientId_updatedAt_idx" ON "AccountingPeriod"("clientId", "updatedAt");

CREATE TABLE "CustomClientTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "categoryId" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "taskType" TEXT NOT NULL,
  "validFrom" DATETIME NOT NULL,
  "validUntil" DATETIME,
  "executionYear" INTEGER,
  "executionMonth" INTEGER,
  "processor" TEXT,
  "reviewer" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "CustomClientTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CustomClientTask_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "CustomClientTask_clientId_active_taskType_idx" ON "CustomClientTask"("clientId", "active", "taskType");
CREATE INDEX "CustomClientTask_categoryId_idx" ON "CustomClientTask"("categoryId");

CREATE TABLE "ChecklistTask" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "periodId" INTEGER NOT NULL,
  "standardTaskId" INTEGER,
  "customClientTaskId" INTEGER,
  "taskIdSnapshot" TEXT NOT NULL,
  "categorySnapshot" TEXT NOT NULL,
  "categorySortOrder" INTEGER NOT NULL DEFAULT 0,
  "subcategorySnapshot" TEXT,
  "titleSnapshot" TEXT NOT NULL,
  "workInstructionSnapshot" TEXT,
  "reviewInstructionSnapshot" TEXT,
  "mandatorySnapshot" BOOLEAN NOT NULL DEFAULT false,
  "sortOrderSnapshot" INTEGER,
  "professionalVersionSnapshot" TEXT,
  "origin" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Offen',
  "processingNote" TEXT,
  "processedAt" DATETIME,
  "processorInitials" TEXT,
  "notApplicableReason" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ChecklistTask_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "AccountingPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ChecklistTask_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ChecklistTask_customClientTaskId_fkey" FOREIGN KEY ("customClientTaskId") REFERENCES "CustomClientTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ChecklistTask_periodId_categorySortOrder_sortOrderSnapshot_idx" ON "ChecklistTask"("periodId", "categorySortOrder", "sortOrderSnapshot");
CREATE INDEX "ChecklistTask_standardTaskId_idx" ON "ChecklistTask"("standardTaskId");
CREATE INDEX "ChecklistTask_customClientTaskId_idx" ON "ChecklistTask"("customClientTaskId");
