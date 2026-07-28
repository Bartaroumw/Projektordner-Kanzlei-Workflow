-- Additive foundation for the internal FiBu-Lohn reconciliation module.
-- Existing clients remain opt-out by default and no historical data is changed.
ALTER TABLE "Client" ADD COLUMN "payrollPreparedByFirm" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN "payrollUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Client" ADD COLUMN "payrollServiceStart" DATETIME;
ALTER TABLE "Client" ADD COLUMN "payrollServiceEnd" DATETIME;
ALTER TABLE "Client" ADD COLUMN "payrollResponsibilityNote" TEXT;

CREATE TABLE "PayrollReconciliationTopic" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "reviewQuestion" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "topicType" TEXT NOT NULL,
    "vehicleRelated" BOOLEAN NOT NULL DEFAULT false,
    "followUpAllowed" BOOLEAN NOT NULL DEFAULT false,
    "campusStandardTaskId" INTEGER,
    "requiredStandardFields" TEXT NOT NULL,
    "requiredDocumentTypes" TEXT NOT NULL,
    "notes" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollReconciliationTopic_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationTopic_campusStandardTaskId_fkey" FOREIGN KEY ("campusStandardTaskId") REFERENCES "StandardTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "ClientPayrollResponsibilityHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "payrollPreparedByFirm" BOOLEAN NOT NULL,
    "payrollUserId" INTEGER,
    "payrollUserNameSnapshot" TEXT,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "note" TEXT,
    "changedByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientPayrollResponsibilityHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientPayrollResponsibilityHistory_payrollUserId_fkey" FOREIGN KEY ("payrollUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientPayrollResponsibilityHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PayrollReconciliationTopicHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topicId" INTEGER NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "actorNameSnapshot" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollReconciliationTopicHistory_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "PayrollReconciliationTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationTopicHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PayrollReconciliation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "accountingYear" INTEGER NOT NULL,
    "accountingMonth" INTEGER NOT NULL,
    "payrollYear" INTEGER NOT NULL,
    "payrollMonth" INTEGER NOT NULL,
    "accountingPeriodId" INTEGER NOT NULL,
    "checklistTaskId" INTEGER NOT NULL,
    "processorUserId" INTEGER,
    "processorNameSnapshot" TEXT,
    "reviewerUserId" INTEGER,
    "reviewerNameSnapshot" TEXT,
    "payrollUserId" INTEGER NOT NULL,
    "payrollUserNameSnapshot" TEXT NOT NULL,
    "accountingStatus" TEXT NOT NULL DEFAULT 'Offen',
    "payrollStatus" TEXT NOT NULL DEFAULT 'Neu',
    "transferredAt" DATETIME,
    "seenAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollReconciliation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliation_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "AccountingPeriod" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliation_checklistTaskId_fkey" FOREIGN KEY ("checklistTaskId") REFERENCES "ChecklistTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliation_processorUserId_fkey" FOREIGN KEY ("processorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliation_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliation_payrollUserId_fkey" FOREIGN KEY ("payrollUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PayrollReconciliationItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reconciliationId" INTEGER NOT NULL,
    "sourceTopicId" INTEGER NOT NULL,
    "topicKeySnapshot" TEXT NOT NULL,
    "topicTitleSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "reviewQuestionSnapshot" TEXT NOT NULL,
    "sortOrderSnapshot" INTEGER NOT NULL DEFAULT 0,
    "topicTypeSnapshot" TEXT NOT NULL,
    "vehicleRelatedSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "requiredFieldsSnapshot" TEXT NOT NULL,
    "requiredDocumentsSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Noch nicht geprüft',
    "matterPresent" TEXT NOT NULL DEFAULT 'Noch offen',
    "payrollProcessingStatus" TEXT NOT NULL DEFAULT 'Offen',
    "payrollProcessedAt" DATETIME,
    "processedByUserId" INTEGER,
    "reviewedAt" DATETIME,
    "fullyTransferredAt" DATETIME,
    "note" TEXT,
    "detailsJson" TEXT,
    "missingDocumentType" TEXT,
    "documentToFollow" BOOLEAN NOT NULL DEFAULT false,
    "followUpReason" TEXT,
    "expectedFollowUpAt" DATETIME,
    "followUpAllowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PayrollReconciliationItem_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PayrollReconciliation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationItem_sourceTopicId_fkey" FOREIGN KEY ("sourceTopicId") REFERENCES "PayrollReconciliationTopic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationItem_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PayrollReconciliationQuestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reconciliationId" INTEGER NOT NULL,
    "reconciliationItemId" INTEGER NOT NULL,
    "senderUserId" INTEGER NOT NULL,
    "recipientUserId" INTEGER NOT NULL,
    "senderDepartment" TEXT NOT NULL,
    "recipientDepartment" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Offen beim Rechnungswesen',
    "answer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "PayrollReconciliationQuestion_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PayrollReconciliation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationQuestion_reconciliationItemId_fkey" FOREIGN KEY ("reconciliationItemId") REFERENCES "PayrollReconciliationItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationQuestion_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationQuestion_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PayrollDocumentReference" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reconciliationItemId" INTEGER NOT NULL,
    "questionId" INTEGER,
    "displayName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileExtension" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" INTEGER NOT NULL,
    "archivedAt" DATETIME,
    "archivedByUserId" INTEGER,
    CONSTRAINT "PayrollDocumentReference_reconciliationItemId_fkey" FOREIGN KEY ("reconciliationItemId") REFERENCES "PayrollReconciliationItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollDocumentReference_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "PayrollReconciliationQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayrollDocumentReference_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollDocumentReference_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ClientVehicle" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "referenceNumber" TEXT,
    "description" TEXT NOT NULL,
    "licensePlate" TEXT,
    "userName" TEXT NOT NULL,
    "userFunction" TEXT NOT NULL,
    "contractAvailable" BOOLEAN NOT NULL DEFAULT false,
    "contractReference" TEXT,
    "contractDate" DATETIME,
    "ownershipType" TEXT NOT NULL,
    "grossListPriceCents" INTEGER,
    "documentReference" TEXT,
    "onePercentRule" BOOLEAN NOT NULL DEFAULT false,
    "logbook" BOOLEAN NOT NULL DEFAULT false,
    "commuteUse" BOOLEAN NOT NULL DEFAULT false,
    "accountingAccount" TEXT,
    "accountingBasis" TEXT,
    "accountingExplanation" TEXT,
    "validFrom" DATETIME NOT NULL,
    "validUntil" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "note" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "updatedByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientVehicle_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientVehicle_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientVehicle_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ClientVehicleChange" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vehicleId" INTEGER NOT NULL,
    "reconciliationItemId" INTEGER,
    "changeType" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "previousValueJson" TEXT,
    "newValueJson" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientVehicleChange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "ClientVehicle" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ClientVehicleChange_reconciliationItemId_fkey" FOREIGN KEY ("reconciliationItemId") REFERENCES "PayrollReconciliationItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClientVehicleChange_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "PayrollReconciliationHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reconciliationId" INTEGER NOT NULL,
    "reconciliationItemId" INTEGER,
    "vehicleId" INTEGER,
    "actorUserId" INTEGER NOT NULL,
    "actorNameSnapshot" TEXT NOT NULL,
    "actorDepartment" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PayrollReconciliationHistory_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "PayrollReconciliation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationHistory_reconciliationItemId_fkey" FOREIGN KEY ("reconciliationItemId") REFERENCES "PayrollReconciliationItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "ClientVehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PayrollReconciliationHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PayrollReconciliationTopic_key_key" ON "PayrollReconciliationTopic"("key");
CREATE INDEX "PayrollReconciliationTopic_status_validFrom_validUntil_sortOrder_idx" ON "PayrollReconciliationTopic"("status", "validFrom", "validUntil", "sortOrder");
CREATE INDEX "PayrollReconciliationTopic_campusStandardTaskId_idx" ON "PayrollReconciliationTopic"("campusStandardTaskId");
CREATE INDEX "ClientPayrollResponsibilityHistory_clientId_createdAt_idx" ON "ClientPayrollResponsibilityHistory"("clientId", "createdAt");
CREATE INDEX "ClientPayrollResponsibilityHistory_payrollUserId_idx" ON "ClientPayrollResponsibilityHistory"("payrollUserId");
CREATE INDEX "ClientPayrollResponsibilityHistory_changedByUserId_idx" ON "ClientPayrollResponsibilityHistory"("changedByUserId");
CREATE INDEX "PayrollReconciliationTopicHistory_topicId_occurredAt_idx" ON "PayrollReconciliationTopicHistory"("topicId", "occurredAt");
CREATE INDEX "PayrollReconciliationTopicHistory_actorUserId_occurredAt_idx" ON "PayrollReconciliationTopicHistory"("actorUserId", "occurredAt");
CREATE UNIQUE INDEX "PayrollReconciliation_accountingPeriodId_key" ON "PayrollReconciliation"("accountingPeriodId");
CREATE UNIQUE INDEX "PayrollReconciliation_checklistTaskId_key" ON "PayrollReconciliation"("checklistTaskId");
CREATE INDEX "PayrollReconciliation_payrollUserId_payrollStatus_payrollYear_payrollMonth_idx" ON "PayrollReconciliation"("payrollUserId", "payrollStatus", "payrollYear", "payrollMonth");
CREATE INDEX "PayrollReconciliation_clientId_accountingYear_accountingMonth_idx" ON "PayrollReconciliation"("clientId", "accountingYear", "accountingMonth");
CREATE UNIQUE INDEX "PayrollReconciliation_clientId_payrollYear_payrollMonth_key" ON "PayrollReconciliation"("clientId", "payrollYear", "payrollMonth");
CREATE INDEX "PayrollReconciliationItem_reconciliationId_sortOrderSnapshot_idx" ON "PayrollReconciliationItem"("reconciliationId", "sortOrderSnapshot");
CREATE INDEX "PayrollReconciliationItem_sourceTopicId_idx" ON "PayrollReconciliationItem"("sourceTopicId");
CREATE UNIQUE INDEX "PayrollReconciliationItem_reconciliationId_sourceTopicId_key" ON "PayrollReconciliationItem"("reconciliationId", "sourceTopicId");
CREATE UNIQUE INDEX "PayrollDocumentReference_storedFileName_key" ON "PayrollDocumentReference"("storedFileName");
CREATE UNIQUE INDEX "PayrollDocumentReference_storageKey_key" ON "PayrollDocumentReference"("storageKey");
CREATE INDEX "PayrollDocumentReference_reconciliationItemId_status_idx" ON "PayrollDocumentReference"("reconciliationItemId", "status");
CREATE INDEX "PayrollDocumentReference_questionId_idx" ON "PayrollDocumentReference"("questionId");
CREATE INDEX "PayrollReconciliationQuestion_recipientUserId_status_createdAt_idx" ON "PayrollReconciliationQuestion"("recipientUserId", "status", "createdAt");
CREATE INDEX "PayrollReconciliationQuestion_reconciliationId_reconciliationItemId_idx" ON "PayrollReconciliationQuestion"("reconciliationId", "reconciliationItemId");
CREATE INDEX "ClientVehicle_clientId_status_validFrom_idx" ON "ClientVehicle"("clientId", "status", "validFrom");
CREATE UNIQUE INDEX "ClientVehicle_clientId_referenceNumber_key" ON "ClientVehicle"("clientId", "referenceNumber");
CREATE INDEX "ClientVehicleChange_vehicleId_effectiveFrom_idx" ON "ClientVehicleChange"("vehicleId", "effectiveFrom");
CREATE INDEX "ClientVehicleChange_reconciliationItemId_idx" ON "ClientVehicleChange"("reconciliationItemId");
CREATE INDEX "PayrollReconciliationHistory_reconciliationId_occurredAt_idx" ON "PayrollReconciliationHistory"("reconciliationId", "occurredAt");
CREATE INDEX "PayrollReconciliationHistory_reconciliationItemId_occurredAt_idx" ON "PayrollReconciliationHistory"("reconciliationItemId", "occurredAt");
CREATE INDEX "PayrollReconciliationHistory_vehicleId_occurredAt_idx" ON "PayrollReconciliationHistory"("vehicleId", "occurredAt");
CREATE INDEX "PayrollReconciliationHistory_actorUserId_occurredAt_idx" ON "PayrollReconciliationHistory"("actorUserId", "occurredAt");
CREATE INDEX "Client_payrollUserId_idx" ON "Client"("payrollUserId");
