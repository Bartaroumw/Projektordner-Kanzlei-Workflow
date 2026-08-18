export type WorkflowTaskState = {
  status: string;
  mandatorySnapshot: boolean;
  notApplicableReason?: string | null;
  reviewStatus: string;
  reviewIssueStatus?: string | null;
};

const FINISHED_PROCESSING = new Set(["Erledigt", "Nicht zutreffend", "Übertragung vorgeschlagen", "In Folgemonat übertragen"]);
const FINAL_REVIEW = new Set(["In Ordnung"]);
const OPEN_REVIEW = new Set(["Rückfrage", "Beanstandung", "Erledigt nach Nachbearbeitung", "In Prüfung", "Nicht geprüft"]);

export function getInitialReviewStatus() {
  return "Nicht geprüft" as const;
}

export function getBlockingWorkflowItems(tasks: WorkflowTaskState[]) {
  const openProcessing = tasks.filter((task) => !FINISHED_PROCESSING.has(task.status));
  const missingReasons = tasks.filter(
    (task) => task.status === "Nicht zutreffend" && !task.notApplicableReason?.trim(),
  );
  const openObjections = tasks.filter(
    (task) => task.status !== "In Folgemonat übertragen" &&
      (task.reviewStatus === "Beanstandung" || task.reviewIssueStatus === "Offen" && task.reviewStatus === "Beanstandung"),
  );
  const openQuestions = tasks.filter(
    (task) => task.status !== "In Folgemonat übertragen" &&
      (task.reviewStatus === "Rückfrage" || task.reviewIssueStatus === "Offen" && task.reviewStatus === "Rückfrage"),
  );
  const awaitingReReview = tasks.filter(
    (task) => task.status !== "In Folgemonat übertragen" && task.reviewStatus === "Erledigt nach Nachbearbeitung",
  );
  const unreviewed = tasks.filter(
    (task) => task.status !== "In Folgemonat übertragen" && !FINAL_REVIEW.has(task.reviewStatus),
  );

  return {
    openProcessing,
    missingReasons,
    openObjections,
    openQuestions,
    awaitingReReview,
    unreviewed,
    canComplete:
      openProcessing.length === 0 &&
      missingReasons.length === 0 &&
      openObjections.length === 0 &&
      openQuestions.length === 0 &&
      awaitingReReview.length === 0 &&
      unreviewed.length === 0,
  };
}

export function checklistCompletionMessage(tasks: WorkflowTaskState[]) {
  const blockers = getBlockingWorkflowItems(tasks);
  const parts: string[] = [];
  if (blockers.openProcessing.length) parts.push(`${blockers.openProcessing.length} offene Bearbeitungsaufgabe${blockers.openProcessing.length === 1 ? "" : "n"}`);
  if (blockers.openObjections.length) parts.push(`${blockers.openObjections.length} offene Beanstandung${blockers.openObjections.length === 1 ? "" : "en"}`);
  if (blockers.openQuestions.length) parts.push(`${blockers.openQuestions.length} offene Rückfrage${blockers.openQuestions.length === 1 ? "" : "n"}`);
  if (blockers.awaitingReReview.length) parts.push(`${blockers.awaitingReReview.length} erneut zu prüfende Aufgabe${blockers.awaitingReReview.length === 1 ? "" : "n"}`);
  const onlyUnreviewed = blockers.unreviewed.filter(
    (task) => !["Rückfrage", "Beanstandung", "Erledigt nach Nachbearbeitung"].includes(task.reviewStatus),
  );
  if (onlyUnreviewed.length) parts.push(`${onlyUnreviewed.length} noch nicht abschließend geprüfte Aufgabe${onlyUnreviewed.length === 1 ? "" : "n"}`);
  if (blockers.missingReasons.length) parts.push(`${blockers.missingReasons.length} fehlende Begründung${blockers.missingReasons.length === 1 ? "" : "en"}`);
  return parts.length
    ? `Die Checkliste kann noch nicht abgeschlossen werden. Es bestehen ${parts.join(", ")}.`
    : "";
}

export function isOpenReviewStatus(status: string) {
  return OPEN_REVIEW.has(status) && status !== "In Ordnung";
}
