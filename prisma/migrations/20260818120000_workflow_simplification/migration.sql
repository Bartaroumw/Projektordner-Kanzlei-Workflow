-- Workflowvereinfachung: kontrollierte Übertragungsvorschläge und technische
-- Erstansicht der Rechnungswesen-Lohn-Abstimmung. Bestehende Fach- und
-- Historientabellen bleiben unverändert erhalten.
ALTER TABLE "ChecklistTask" ADD COLUMN "transferNote" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferStatus" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferProposedAt" DATETIME;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferProposedByUserId" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferDecidedAt" DATETIME;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferDecidedByUserId" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "transferDecisionReason" TEXT;

ALTER TABLE "PayrollReconciliation" ADD COLUMN "firstViewedAt" DATETIME;
ALTER TABLE "PayrollReconciliation" ADD COLUMN "firstViewedByUserId" INTEGER;
ALTER TABLE "PayrollReconciliation" ADD COLUMN "lastViewedAt" DATETIME;

-- Der frühere Zwischenstatus "Gesehen" wird verlustfrei in den fachlich
-- eindeutigen Bearbeitungsstatus überführt. seenAt bleibt als Legacy-Nachweis
-- vollständig erhalten.
UPDATE "PayrollReconciliation"
SET "payrollStatus" = 'In Bearbeitung'
WHERE "payrollStatus" = 'Gesehen';

CREATE INDEX "ChecklistTask_transferStatus_transferTargetYear_transferTargetMonth_idx"
ON "ChecklistTask"("transferStatus", "transferTargetYear", "transferTargetMonth");

CREATE INDEX "PayrollReconciliation_firstViewedByUserId_lastViewedAt_idx"
ON "PayrollReconciliation"("firstViewedByUserId", "lastViewedAt");
