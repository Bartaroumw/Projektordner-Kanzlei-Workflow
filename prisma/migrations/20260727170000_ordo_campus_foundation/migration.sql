CREATE TABLE "StandardTaskKnowledge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "standardTaskId" INTEGER NOT NULL,
    "shortDescription" TEXT,
    "objective" TEXT,
    "processingGuidance" TEXT,
    "firmStandard" TEXT,
    "reviewerGuidance" TEXT,
    "typicalErrors" TEXT,
    "internalHints" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Entwurf',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StandardTaskKnowledge_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "StandardTaskKnowledgeLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "knowledgeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StandardTaskKnowledgeLink_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "StandardTaskKnowledge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "StandardTaskKnowledgeHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "knowledgeId" INTEGER NOT NULL,
    "standardTaskId" INTEGER NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "actorNameSnapshot" TEXT NOT NULL,
    "changedArea" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StandardTaskKnowledgeHistory_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "StandardTaskKnowledge" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StandardTaskKnowledgeHistory_standardTaskId_fkey" FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StandardTaskKnowledgeHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StandardTaskKnowledge_standardTaskId_key" ON "StandardTaskKnowledge"("standardTaskId");
CREATE INDEX "StandardTaskKnowledge_status_updatedAt_idx" ON "StandardTaskKnowledge"("status", "updatedAt");
CREATE INDEX "StandardTaskKnowledgeLink_knowledgeId_active_sortOrder_idx" ON "StandardTaskKnowledgeLink"("knowledgeId", "active", "sortOrder");
CREATE INDEX "StandardTaskKnowledgeLink_title_idx" ON "StandardTaskKnowledgeLink"("title");
CREATE INDEX "StandardTaskKnowledgeHistory_standardTaskId_occurredAt_idx" ON "StandardTaskKnowledgeHistory"("standardTaskId", "occurredAt");
CREATE INDEX "StandardTaskKnowledgeHistory_actorUserId_occurredAt_idx" ON "StandardTaskKnowledgeHistory"("actorUserId", "occurredAt");
