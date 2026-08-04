-- Remove redundant index already covered by the unique constraint.
DROP INDEX "AnnualChecklist_functionSeparationExceptionId_idx";

-- SQLite requires a table reconstruction to add NOT NULL/default semantics
-- while preserving every existing AccountingPeriod row and relation.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_AccountingPeriod" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "checklistType" TEXT NOT NULL DEFAULT 'Monat',
    "processingStatus" TEXT NOT NULL DEFAULT 'Offen',
    "processorSnapshot" TEXT,
    "reviewerSnapshot" TEXT,
    "managementNameSnapshot" TEXT,
    "processorUserId" INTEGER,
    "reviewerUserId" INTEGER,
    "managementUserId" INTEGER,
    "currentActorInitials" TEXT,
    "submittedForReviewAt" DATETIME,
    "reviewStartedAt" DATETIME,
    "returnedAt" DATETIME,
    "lastReviewAt" DATETIME,
    "lastStatusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "functionSeparationExceptionId" INTEGER,
    CONSTRAINT "AccountingPeriod_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountingPeriod_processorUserId_fkey" FOREIGN KEY ("processorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "AccountingPeriod_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "AccountingPeriod_managementUserId_fkey" FOREIGN KEY ("managementUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "AccountingPeriod_functionSeparationExceptionId_fkey" FOREIGN KEY ("functionSeparationExceptionId") REFERENCES "FunctionSeparationException" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_AccountingPeriod" (
    "calendarYear",
    "checklistCreatedAt",
    "checklistType",
    "clientId",
    "completedAt",
    "createdAt",
    "currentActorInitials",
    "functionSeparationExceptionId",
    "generalNote",
    "id",
    "lastReviewAt",
    "lastStatusChangedAt",
    "managementNameSnapshot",
    "managementUserId",
    "month",
    "periodLabel",
    "processingStatus",
    "processorSnapshot",
    "processorUserId",
    "profileHasCashRegister",
    "profileHasFixedAssets",
    "profileHasLoans",
    "profileHasPayroll",
    "profileHasPermanentExtension",
    "profileHasReceivablesPayables",
    "profileLegalFormGroup",
    "profileProfitDeterminationMethod",
    "profileSubjectToVat",
    "returnedAt",
    "reviewStartedAt",
    "reviewerSnapshot",
    "reviewerUserId",
    "submittedForReviewAt",
    "updatedAt"
)
SELECT
    "calendarYear",
    "checklistCreatedAt",
    "checklistType",
    "clientId",
    "completedAt",
    "createdAt",
    "currentActorInitials",
    "functionSeparationExceptionId",
    "generalNote",
    "id",
    "lastReviewAt",
    coalesce("lastStatusChangedAt", CURRENT_TIMESTAMP),
    "managementNameSnapshot",
    "managementUserId",
    "month",
    "periodLabel",
    "processingStatus",
    "processorSnapshot",
    "processorUserId",
    "profileHasCashRegister",
    "profileHasFixedAssets",
    "profileHasLoans",
    "profileHasPayroll",
    "profileHasPermanentExtension",
    "profileHasReceivablesPayables",
    "profileLegalFormGroup",
    "profileProfitDeterminationMethod",
    "profileSubjectToVat",
    "returnedAt",
    "reviewStartedAt",
    "reviewerSnapshot",
    "reviewerUserId",
    "submittedForReviewAt",
    "updatedAt"
FROM "AccountingPeriod";

DROP TABLE "AccountingPeriod";
ALTER TABLE "new_AccountingPeriod" RENAME TO "AccountingPeriod";

CREATE UNIQUE INDEX "AccountingPeriod_functionSeparationExceptionId_key" ON "AccountingPeriod"("functionSeparationExceptionId");
CREATE INDEX "AccountingPeriod_calendarYear_month_processingStatus_idx" ON "AccountingPeriod"("calendarYear", "month", "processingStatus");
CREATE INDEX "AccountingPeriod_clientId_updatedAt_idx" ON "AccountingPeriod"("clientId", "updatedAt");
CREATE INDEX "AccountingPeriod_processorUserId_idx" ON "AccountingPeriod"("processorUserId");
CREATE INDEX "AccountingPeriod_reviewerUserId_idx" ON "AccountingPeriod"("reviewerUserId");
CREATE INDEX "AccountingPeriod_managementUserId_idx" ON "AccountingPeriod"("managementUserId");
CREATE UNIQUE INDEX "AccountingPeriod_clientId_calendarYear_month_checklistType_key" ON "AccountingPeriod"("clientId", "calendarYear", "month", "checklistType");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
