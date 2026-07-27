PRAGMA foreign_keys=OFF;

CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "fullName" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT,
  "passwordHash" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "shortLabel" TEXT,
  "lastLoginAt" DATETIME,
  "passwordChangedAt" DATETIME,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_active_fullName_idx" ON "User"("active", "fullName");

CREATE TABLE "UserRole" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

CREATE TABLE "Session" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "tokenHash" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "sessionVersion" INTEGER NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "Client" ADD COLUMN "processorUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Client" ADD COLUMN "reviewerUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "Client" ADD COLUMN "managementUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "Client_processorUserId_idx" ON "Client"("processorUserId");
CREATE INDEX "Client_reviewerUserId_idx" ON "Client"("reviewerUserId");
CREATE INDEX "Client_managementUserId_idx" ON "Client"("managementUserId");

ALTER TABLE "AccountingPeriod" ADD COLUMN "processorUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "AccountingPeriod" ADD COLUMN "reviewerUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "AccountingPeriod" ADD COLUMN "managementUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
CREATE INDEX "AccountingPeriod_processorUserId_idx" ON "AccountingPeriod"("processorUserId");
CREATE INDEX "AccountingPeriod_reviewerUserId_idx" ON "AccountingPeriod"("reviewerUserId");
CREATE INDEX "AccountingPeriod_managementUserId_idx" ON "AccountingPeriod"("managementUserId");

ALTER TABLE "WorkflowHistory" ADD COLUMN "actorUserId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "WorkflowHistory" ADD COLUMN "actorNameSnapshot" TEXT;
ALTER TABLE "WorkflowHistory" ADD COLUMN "actorRoleSnapshot" TEXT;
CREATE INDEX "WorkflowHistory_actorUserId_idx" ON "WorkflowHistory"("actorUserId");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
