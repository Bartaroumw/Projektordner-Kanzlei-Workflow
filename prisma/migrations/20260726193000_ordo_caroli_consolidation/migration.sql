ALTER TABLE "Client" ADD COLUMN "vatFilingPeriod" TEXT NOT NULL DEFAULT 'Monatlich';
ALTER TABLE "Client" ADD COLUMN "managementName" TEXT;

UPDATE "Client"
SET "vatFilingPeriod" = CASE
  WHEN lower("cadence") LIKE 'viertelj%' THEN 'Vierteljährlich'
  WHEN lower("cadence") LIKE 'jährlich%' THEN 'Jährlich'
  ELSE 'Monatlich'
END;

ALTER TABLE "AccountingPeriod" ADD COLUMN "managementNameSnapshot" TEXT;
UPDATE "AccountingPeriod"
SET "managementNameSnapshot" = (
  SELECT "managementName" FROM "Client" WHERE "Client"."id" = "AccountingPeriod"."clientId"
);

UPDATE "AccountingPeriod"
SET "periodLabel" = CASE "month"
  WHEN 1 THEN 'Januar ' || "calendarYear"
  WHEN 2 THEN 'Februar ' || "calendarYear"
  WHEN 3 THEN 'März ' || "calendarYear"
  WHEN 4 THEN 'April ' || "calendarYear"
  WHEN 5 THEN 'Mai ' || "calendarYear"
  WHEN 6 THEN 'Juni ' || "calendarYear"
  WHEN 7 THEN 'Juli ' || "calendarYear"
  WHEN 8 THEN 'August ' || "calendarYear"
  WHEN 9 THEN 'September ' || "calendarYear"
  WHEN 10 THEN 'Oktober ' || "calendarYear"
  WHEN 11 THEN 'November ' || "calendarYear"
  WHEN 12 THEN 'Dezember ' || "calendarYear"
  ELSE "periodLabel"
END
WHERE "checklistType" = 'Monat';

ALTER TABLE "ChecklistTask" ADD COLUMN "sourceTaskId" INTEGER REFERENCES "ChecklistTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferTargetYear" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferTargetMonth" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferReason" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferActorName" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferExpectedAction" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferredAt" DATETIME;

CREATE INDEX "ChecklistTask_sourceTaskId_idx" ON "ChecklistTask"("sourceTaskId");
CREATE UNIQUE INDEX "ChecklistTask_periodId_sourceTaskId_key" ON "ChecklistTask"("periodId", "sourceTaskId");
