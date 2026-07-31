export type ChecklistTaskDraft = {
  status: string;
  processingNote: string;
  notApplicableReason: string;
  carryProcessingNote: boolean;
};

export type ChecklistTaskChange = ChecklistTaskDraft & {
  taskId: number;
  expectedUpdatedAt: string;
};

export type ChecklistTaskSaveResult = {
  taskId: number;
  ok: boolean;
  code: "SAVED" | "VALIDATION" | "FORBIDDEN" | "CONFLICT" | "NOT_FOUND" | "TECHNICAL";
  message: string;
  saved?: ChecklistTaskDraft & { updatedAt: string };
};

export type ChecklistBatchSaveResult = {
  results: ChecklistTaskSaveResult[];
};

export function sameTaskDraft(left: ChecklistTaskDraft, right: ChecklistTaskDraft) {
  return left.status === right.status &&
    left.processingNote === right.processingNote &&
    left.notApplicableReason === right.notApplicableReason &&
    left.carryProcessingNote === right.carryProcessingNote;
}

export function validateTaskDraft(draft: ChecklistTaskDraft) {
  if (draft.status === "Nicht zutreffend" && !draft.notApplicableReason.trim()) {
    return "Die Begründung für „Nicht zutreffend“ fehlt.";
  }
  if (draft.carryProcessingNote && !draft.processingNote.trim()) {
    return "Für die Übernahme in die Folgeperiode ist eine Bearbeitungsnotiz erforderlich.";
  }
  return null;
}
