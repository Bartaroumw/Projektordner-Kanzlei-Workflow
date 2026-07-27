-- Additive Ausführungsplanung für Rechnungswesenaufgaben.
-- Bestehende Checklisten-Snapshots und Jahresabschlussaufgaben bleiben unverändert.
ALTER TABLE "StandardTask" ADD COLUMN "executionMonths" TEXT;
ALTER TABLE "StandardTask" ADD COLUMN "taskArea" TEXT;

UPDATE "StandardTask"
SET
  "executionMonths" = CASE
    WHEN "checklistType" IN ('Monat', 'Beide') THEN
      CASE
        WHEN "rhythm" = 'Quartalsweise' THEN '3;6;9;12'
        WHEN "rhythm" = 'Bestimmter Monat' AND "executionMonth" IS NOT NULL THEN CAST("executionMonth" AS TEXT)
        WHEN "rhythm" = 'Jährlich' AND "executionMonth" IS NOT NULL THEN CAST("executionMonth" AS TEXT)
        ELSE '1;2;3;4;5;6;7;8;9;10;11;12'
      END
    ELSE NULL
  END,
  "rhythm" = CASE
    WHEN "checklistType" IN ('Monat', 'Beide') AND "rhythm" = 'Quartalsweise' THEN 'Vierteljährlich'
    WHEN "checklistType" IN ('Monat', 'Beide') AND "rhythm" = 'Bestimmter Monat' THEN 'Benutzerdefinierte Monate'
    ELSE "rhythm"
  END;

ALTER TABLE "CustomClientTask" ADD COLUMN "executionRhythm" TEXT;
ALTER TABLE "CustomClientTask" ADD COLUMN "executionMonths" TEXT;
ALTER TABLE "CustomClientTask" ADD COLUMN "taskArea" TEXT;

UPDATE "CustomClientTask"
SET
  "executionRhythm" = CASE
    WHEN "taskType" = 'Wiederkehrend quartalsweise' THEN 'Vierteljährlich'
    WHEN "taskType" = 'Wiederkehrend jährlich' THEN 'Jährlich'
    WHEN "taskType" = 'Wiederkehrend monatlich' THEN 'Monatlich'
    ELSE NULL
  END,
  "executionMonths" = CASE
    WHEN "taskType" = 'Wiederkehrend quartalsweise' THEN '3;6;9;12'
    WHEN "taskType" = 'Wiederkehrend jährlich' THEN '1'
    WHEN "taskType" = 'Wiederkehrend monatlich' THEN '1;2;3;4;5;6;7;8;9;10;11;12'
    WHEN "taskType" = 'Einmalig' AND "executionMonth" IS NOT NULL THEN CAST("executionMonth" AS TEXT)
    ELSE NULL
  END;

CREATE TABLE "StandardTaskPlanningHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "standardTaskId" INTEGER NOT NULL,
  "actorUserId" INTEGER NOT NULL,
  "actorNameSnapshot" TEXT NOT NULL,
  "changedArea" TEXT NOT NULL,
  "previousValue" TEXT,
  "newValue" TEXT,
  "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StandardTaskPlanningHistory_standardTaskId_fkey"
    FOREIGN KEY ("standardTaskId") REFERENCES "StandardTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "StandardTaskPlanningHistory_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "StandardTaskPlanningHistory_standardTaskId_occurredAt_idx"
  ON "StandardTaskPlanningHistory"("standardTaskId", "occurredAt");
CREATE INDEX "StandardTaskPlanningHistory_actorUserId_occurredAt_idx"
  ON "StandardTaskPlanningHistory"("actorUserId", "occurredAt");
