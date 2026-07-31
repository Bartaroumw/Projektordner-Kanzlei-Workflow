import { calculateProgress, workflowSummary } from "@/lib/monthly-checklist-service";

export type StatusTask = {
  status: string;
  mandatorySnapshot: boolean;
  reviewStatus: string;
  processingNote: string | null;
  reviewIssueStatus?: string | null;
};

export type StatusChecklist = {
  id: number;
  calendarYear: number;
  month: number;
  periodLabel: string;
  processingStatus: string;
  updatedAt: Date;
  tasks: StatusTask[];
  payrollReconciliation?: { questions: Array<{ status: string }> } | null;
};

export function monthStatusCode(checklist: StatusChecklist | undefined) {
  if (!checklist) return "–";
  if (checklist.processingStatus === "Abgeschlossen") return "A";
  if (checklist.processingStatus === "Nachbearbeitung") return "N";
  if (["Zur Prüfung", "In Prüfung"].includes(checklist.processingStatus)) return "P";
  if (checklist.processingStatus === "In Bearbeitung") return "B";
  return "O";
}

export function contiguousThrough(months: StatusChecklist[], predicate: (checklist: StatusChecklist) => boolean) {
  const byMonth = new Map(months.map((checklist) => [checklist.month, checklist]));
  let through = 0;
  for (let month = 1; month <= 12; month += 1) {
    const checklist = byMonth.get(month);
    if (!checklist || !predicate(checklist)) break;
    through = month;
  }
  return through;
}

export function buildClientAccountingStatus(months: StatusChecklist[], referenceMonth = 12) {
  const sorted = [...months].sort((a, b) => a.month - b.month);
  const byMonth = new Map(sorted.map((checklist) => [checklist.month, checklist]));
  const processingThrough = contiguousThrough(sorted, (checklist) =>
    checklist.tasks.every((task) => ["Erledigt", "Nicht zutreffend", "In Folgemonat übertragen"].includes(task.status)),
  );
  const reviewThrough = contiguousThrough(sorted, (checklist) =>
    checklist.processingStatus === "Abgeschlossen" || (
      checklist.tasks.length > 0 &&
      checklist.tasks.every((task) => ["In Ordnung", "Erledigt nach Nachbearbeitung"].includes(task.reviewStatus))
    ),
  );
  const overallThrough = contiguousThrough(sorted, (checklist) => checklist.processingStatus === "Abgeschlossen");
  const firstGapMonth = Array.from({ length: Math.max(1, Math.min(referenceMonth, 12)) }, (_, index) => index + 1)
    .find((month) => !byMonth.has(month) || byMonth.get(month)?.processingStatus !== "Abgeschlossen") ?? null;
  const active = sorted.find((checklist) => checklist.processingStatus !== "Abgeschlossen") ?? null;
  const oldOpenCount = sorted.filter((checklist) =>
    checklist.month < referenceMonth && checklist.processingStatus !== "Abgeschlossen",
  ).length;
  const openReviewPoints = sorted.reduce((total, checklist) => total + workflowSummary(checklist.tasks).openReviewPoints, 0);
  const openPayrollQuestions = sorted.reduce((total, checklist) =>
    total + (checklist.payrollReconciliation?.questions.filter((question) => !question.status.startsWith("Erledigt")).length ?? 0), 0);
  const activeProgress = active ? calculateProgress(active.tasks) : null;
  return {
    processingThrough,
    reviewThrough,
    overallThrough,
    firstGapMonth,
    active,
    activeProgress,
    oldOpenCount,
    openReviewPoints,
    openPayrollQuestions,
    monthCodes: Array.from({ length: 12 }, (_, index) => monthStatusCode(byMonth.get(index + 1))),
  };
}

export function monthShort(month: number | null) {
  if (!month) return "–";
  return new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" })
    .format(new Date(Date.UTC(2026, month - 1, 15)))
    .replace(".", "");
}
