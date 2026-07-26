-- CreateTable
CREATE TABLE "TaskCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StandardTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checklistType" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "subcategory" TEXT,
    "title" TEXT NOT NULL,
    "workInstruction" TEXT,
    "reviewInstruction" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "rhythm" TEXT NOT NULL,
    "executionMonth" INTEGER,
    "legalFormGroups" TEXT NOT NULL,
    "profitDeterminationMethods" TEXT NOT NULL,
    "cashCondition" TEXT NOT NULL,
    "payrollCondition" TEXT NOT NULL,
    "fixedAssetsCondition" TEXT NOT NULL,
    "receivablesPayablesCondition" TEXT NOT NULL,
    "loansCondition" TEXT NOT NULL,
    "vatCondition" TEXT NOT NULL,
    "permanentExtensionCondition" TEXT NOT NULL,
    "knowledgeKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "professionalVersion" TEXT NOT NULL,
    "internalNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StandardTask_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TaskCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskImportHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalFileName" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "professionalVersion" TEXT,
    "createdCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "unchangedCount" INTEGER NOT NULL,
    "deactivatedCount" INTEGER NOT NULL,
    "errorRowCount" INTEGER NOT NULL,
    "createdCategoryCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TaskImportPreview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalFileName" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "previewJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCategory_name_key" ON "TaskCategory"("name");
CREATE INDEX "TaskCategory_active_sortOrder_idx" ON "TaskCategory"("active", "sortOrder");
CREATE UNIQUE INDEX "StandardTask_taskId_key" ON "StandardTask"("taskId");
CREATE INDEX "StandardTask_active_checklistType_idx" ON "StandardTask"("active", "checklistType");
CREATE INDEX "StandardTask_categoryId_sortOrder_idx" ON "StandardTask"("categoryId", "sortOrder");
CREATE INDEX "TaskImportPreview_expiresAt_idx" ON "TaskImportPreview"("expiresAt");
