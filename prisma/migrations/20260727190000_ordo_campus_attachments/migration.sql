CREATE TABLE "StandardTaskKnowledgeAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "standardTaskId" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileExtension" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Aktiv',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" INTEGER NOT NULL,
    "archivedAt" DATETIME,
    "archivedByUserId" INTEGER,
    CONSTRAINT "StandardTaskKnowledgeAttachment_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StandardTaskKnowledgeAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StandardTaskKnowledgeAttachment_archivedByUserId_fkey" FOREIGN KEY ("archivedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StandardTaskKnowledgeAttachment_storedFileName_key" ON "StandardTaskKnowledgeAttachment"("storedFileName");
CREATE UNIQUE INDEX "StandardTaskKnowledgeAttachment_storageKey_key" ON "StandardTaskKnowledgeAttachment"("storageKey");
CREATE INDEX "StandardTaskKnowledgeAttachment_standardTaskId_status_sortOrder_idx" ON "StandardTaskKnowledgeAttachment"("standardTaskId", "status", "sortOrder");
CREATE INDEX "StandardTaskKnowledgeAttachment_uploadedByUserId_uploadedAt_idx" ON "StandardTaskKnowledgeAttachment"("uploadedByUserId", "uploadedAt");
CREATE INDEX "StandardTaskKnowledgeAttachment_archivedByUserId_idx" ON "StandardTaskKnowledgeAttachment"("archivedByUserId");
