PRAGMA foreign_keys=OFF;

ALTER TABLE "AccountingPeriod" ADD COLUMN "functionSeparationExceptionId" INTEGER REFERENCES "FunctionSeparationException"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnnualChecklist" ADD COLUMN "functionSeparationExceptionId" INTEGER REFERENCES "FunctionSeparationException"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD COLUMN "functionSeparationExceptionId" INTEGER REFERENCES "FunctionSeparationException"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD COLUMN "reason" TEXT;
ALTER TABLE "AnnualWorkflowHistory" ADD COLUMN "functionSeparationExceptionId" INTEGER REFERENCES "FunctionSeparationException"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FunctionSeparationException" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "clientId" INTEGER NOT NULL,
  "fiscalYear" INTEGER,
  "assignedUserId" INTEGER NOT NULL,
  "equalRoles" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "approvedByUserId" INTEGER NOT NULL,
  "approvedByNameSnapshot" TEXT NOT NULL,
  "approvedByRoleSnapshot" TEXT NOT NULL,
  "confirmed" BOOLEAN NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FunctionSeparationException_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FunctionSeparationException_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FunctionSeparationException_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "FunctionSeparationException_clientId_fiscalYear_active_idx" ON "FunctionSeparationException"("clientId","fiscalYear","active");
CREATE INDEX "FunctionSeparationException_assignedUserId_idx" ON "FunctionSeparationException"("assignedUserId");
CREATE INDEX "FunctionSeparationException_approvedByUserId_idx" ON "FunctionSeparationException"("approvedByUserId");
CREATE INDEX "AccountingPeriod_functionSeparationExceptionId_idx" ON "AccountingPeriod"("functionSeparationExceptionId");
CREATE INDEX "AnnualChecklist_functionSeparationExceptionId_idx" ON "AnnualChecklist"("functionSeparationExceptionId");
CREATE UNIQUE INDEX "AccountingPeriod_functionSeparationExceptionId_key" ON "AccountingPeriod"("functionSeparationExceptionId");
CREATE UNIQUE INDEX "AnnualChecklist_functionSeparationExceptionId_key" ON "AnnualChecklist"("functionSeparationExceptionId");

PRAGMA foreign_keys=ON;
