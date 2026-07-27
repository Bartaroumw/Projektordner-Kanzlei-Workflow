-- Additive workflow metadata. Historical tasks and snapshots remain unchanged.
ALTER TABLE "ChecklistTask" ADD COLUMN "carryProcessingNote" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChecklistTask" ADD COLUMN "carriedNoteSourceTaskId" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "carriedNoteSourcePeriodLabel" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueStatus" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueRaisedByUserId" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueRaisedByName" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueRaisedByRole" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueDirectedToUserId" INTEGER;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueDirectedToName" TEXT;
ALTER TABLE "ChecklistTask" ADD COLUMN "reviewIssueDirectedToRole" TEXT;
