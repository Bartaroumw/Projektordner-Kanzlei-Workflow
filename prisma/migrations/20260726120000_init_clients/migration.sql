-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "processor" TEXT,
    "reviewer" TEXT,
    "team" TEXT,
    "cadence" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "internalNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnnualProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "calendarYear" INTEGER NOT NULL,
    "legalFormGroup" TEXT NOT NULL,
    "profitDeterminationMethod" TEXT NOT NULL,
    "hasCashRegister" BOOLEAN NOT NULL DEFAULT false,
    "hasPayroll" BOOLEAN NOT NULL DEFAULT false,
    "hasFixedAssets" BOOLEAN NOT NULL DEFAULT false,
    "hasReceivablesPayables" BOOLEAN NOT NULL DEFAULT false,
    "hasLoans" BOOLEAN NOT NULL DEFAULT false,
    "subjectToVat" BOOLEAN NOT NULL DEFAULT false,
    "hasPermanentExtension" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AnnualProfile_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_clientNumber_key" ON "Client"("clientNumber");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE INDEX "Client_active_idx" ON "Client"("active");

-- CreateIndex
CREATE INDEX "AnnualProfile_calendarYear_idx" ON "AnnualProfile"("calendarYear");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualProfile_clientId_calendarYear_key" ON "AnnualProfile"("clientId", "calendarYear");
