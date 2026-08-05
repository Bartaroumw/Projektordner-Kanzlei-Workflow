-- Add protected, optional profile images without changing existing users.
CREATE TABLE "UserProfileImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedByUserId" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfileImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserProfileImage_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "UserProfileImageHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetUserId" INTEGER NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserProfileImageHistory_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserProfileImageHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserProfileImage_userId_key" ON "UserProfileImage"("userId");
CREATE UNIQUE INDEX "UserProfileImage_storedFileName_key" ON "UserProfileImage"("storedFileName");
CREATE INDEX "UserProfileImage_uploadedByUserId_uploadedAt_idx" ON "UserProfileImage"("uploadedByUserId", "uploadedAt");
CREATE INDEX "UserProfileImageHistory_targetUserId_occurredAt_idx" ON "UserProfileImageHistory"("targetUserId", "occurredAt");
CREATE INDEX "UserProfileImageHistory_actorUserId_occurredAt_idx" ON "UserProfileImageHistory"("actorUserId", "occurredAt");
