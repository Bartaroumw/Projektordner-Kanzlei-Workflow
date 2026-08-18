export type ReviewTaskDraft = {
  reviewStatus: string;
  reviewNote: string;
};

export type ReviewTaskChange = ReviewTaskDraft & {
  taskId: number;
  expectedUpdatedAt: string;
};

export type ReviewTaskSaveResult = {
  taskId: number;
  ok: boolean;
  code: "SAVED" | "VALIDATION" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "TECHNICAL";
  message: string;
  saved?: ReviewTaskDraft & { updatedAt: string };
};

export type ReviewBatchSaveResult = { results: ReviewTaskSaveResult[] };

export function sameReviewDraft(left: ReviewTaskDraft, right: ReviewTaskDraft) {
  return left.reviewStatus === right.reviewStatus && left.reviewNote === right.reviewNote;
}

export function validateReviewDraft(draft: ReviewTaskDraft) {
  if (!draft.reviewStatus || ["Nicht geprüft", "In Prüfung", "Erledigt nach Nachbearbeitung"].includes(draft.reviewStatus)) {
    return "Bitte treffen Sie eine ausdrückliche Prüfentscheidung.";
  }
  if (["Rückfrage", "Beanstandung"].includes(draft.reviewStatus) && !draft.reviewNote.trim()) {
    return `Die Prüfentscheidung „${draft.reviewStatus}“ benötigt eine Prüfnotiz.`;
  }
  return null;
}
