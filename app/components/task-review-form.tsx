"use client";

import { useEffect, useMemo } from "react";
import { useReviewBatch } from "@/app/components/review-batch-provider";
import type { ReviewTaskDraft } from "@/lib/review-batch";

export function TaskReviewForm({
  taskId,
  title,
  updatedAt,
  initialStatus,
  reviewNote,
  statuses,
}: {
  taskId: number;
  title: string;
  updatedAt: string;
  initialStatus: string;
  reviewNote: string | null;
  statuses: readonly string[];
}) {
  const {register,entry:readEntry,update,discard,saving} = useReviewBatch();
  const initial = useMemo<ReviewTaskDraft>(() => ({
    reviewStatus: ["Nicht geprüft", "In Prüfung", "Erledigt nach Nachbearbeitung"].includes(initialStatus) ? "" : initialStatus,
    reviewNote: reviewNote ?? "",
  }), [initialStatus, reviewNote]);
  useEffect(() => register(taskId, title, initial, updatedAt), [initial, register, taskId, title, updatedAt]);
  const entry = readEntry(taskId);
  const value = entry?.current ?? initial;
  const dirty = Boolean(entry && (entry.current.reviewStatus !== entry.baseline.reviewStatus || entry.current.reviewNote !== entry.baseline.reviewNote));
  const set = (patch: Partial<ReviewTaskDraft>) => update(taskId, { ...value, ...patch });
  return <section data-review-draft="true" className="rounded border border-[var(--color-primary)] p-3">
    <h4 className="mb-2 font-semibold">Prüfung</h4>
    <label className="text-xs font-semibold">Prüfstatus
      <select className="input mt-1" value={value.reviewStatus} aria-invalid={Boolean(entry?.error)} onChange={(event) => set({ reviewStatus: event.target.value })}>
        <option value="">Bitte ausdrücklich auswählen</option>
        {statuses.filter((status) => !["Nicht geprüft", "In Prüfung", "Erledigt nach Nachbearbeitung"].includes(status)).map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
    <label className="mt-2 block text-xs font-semibold">Prüfnotiz
      <textarea className="input mt-1 min-h-20" value={value.reviewNote} aria-invalid={Boolean(entry?.error && ["Rückfrage", "Beanstandung"].includes(value.reviewStatus))} onChange={(event) => set({ reviewNote: event.target.value })}/>
    </label>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-[var(--color-text-muted)]">{dirty ? "● Ungespeicherte Prüfänderung" : "Gespeichert"}</span>
      {dirty && <button type="button" className="button-secondary" disabled={saving} onClick={() => discard(taskId)}>Prüfänderung verwerfen</button>}
    </div>
    {entry?.error && <p className="mt-3 rounded border border-[var(--color-error)] bg-red-50 p-3 text-sm text-[var(--color-error)]" role="alert">{entry.error}{entry.conflict && <span className="mt-1 block">Ihre Eingaben wurden nicht überschrieben.</span>}</p>}
  </section>;
}
