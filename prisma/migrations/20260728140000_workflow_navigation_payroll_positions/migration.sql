-- Additive extension for structured single and collection positions in FiBu-Lohn topics.
-- Existing topic-level data and all historical reconciliations remain unchanged.
CREATE TABLE "PayrollReconciliationPosition" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reconciliationItemId" INTEGER NOT NULL,
    "positionType" TEXT NOT NULL DEFAULT 'Einzelposition',
    "title" TEXT NOT NULL,
    "caseCount" INTEGER NOT NULL DEFAULT 1,
    "totalAmountCents" INTEGER,
    "period" TEXT,
    "summary" TEXT,
    "peopleJson" TEXT,
    "detailsJson" TEXT,
    "requiredListType" TEXT,
    "requiredListDocumentName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Entwurf',
    "duplicatedFromId" INTEGER,
    "createdByUserId" INTEGER NOT NULL,
    "updatedByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "PayrollReconciliationPosition_reconciliationItemId_fkey" FOREIGN KEY ("reconciliationItemId") REFERENCES "PayrollReconciliationItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationPosition_duplicatedFromId_fkey" FOREIGN KEY ("duplicatedFromId") REFERENCES "PayrollReconciliationPosition" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationPosition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationPosition_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "PayrollDocumentReference" ADD COLUMN "positionId" INTEGER REFERENCES "PayrollReconciliationPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollReconciliationHistory" ADD COLUMN "positionId" INTEGER REFERENCES "PayrollReconciliationPosition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PayrollReconciliationPosition_reconciliationItemId_status_createdAt_idx" ON "PayrollReconciliationPosition"("reconciliationItemId", "status", "createdAt");
CREATE INDEX "PayrollReconciliationPosition_duplicatedFromId_idx" ON "PayrollReconciliationPosition"("duplicatedFromId");
CREATE INDEX "PayrollReconciliationPosition_createdByUserId_idx" ON "PayrollReconciliationPosition"("createdByUserId");
CREATE INDEX "PayrollReconciliationPosition_updatedByUserId_idx" ON "PayrollReconciliationPosition"("updatedByUserId");
CREATE INDEX "PayrollDocumentReference_positionId_status_idx" ON "PayrollDocumentReference"("positionId", "status");
CREATE INDEX "PayrollReconciliationHistory_positionId_occurredAt_idx" ON "PayrollReconciliationHistory"("positionId", "occurredAt");
