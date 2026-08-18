"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  sameReviewDraft,
  validateReviewDraft,
  type ReviewBatchSaveResult,
  type ReviewTaskChange,
  type ReviewTaskDraft,
} from "@/lib/review-batch";

type Entry = {
  title: string;
  baseline: ReviewTaskDraft;
  current: ReviewTaskDraft;
  updatedAt: string;
  error?: string;
  conflict?: boolean;
};

type ReviewContextValue = {
  register: (taskId: number, title: string, initial: ReviewTaskDraft, updatedAt: string) => void;
  update: (taskId: number, draft: ReviewTaskDraft) => void;
  discard: (taskId: number) => void;
  entry: (taskId: number) => Entry | undefined;
  saving: boolean;
};

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function ReviewBatchProvider({
  children,
  saveAction,
  enabled,
  label,
}: {
  children: React.ReactNode;
  saveAction: (changes: ReviewTaskChange[]) => Promise<ReviewBatchSaveResult>;
  enabled: boolean;
  label: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorCursor, setErrorCursor] = useState(0);

  const register = useCallback((taskId: number, title: string, initial: ReviewTaskDraft, updatedAt: string) => {
    setEntries((current) => {
      const existing = current[taskId];
      if (existing && !sameReviewDraft(existing.current, existing.baseline)) return current;
      if (existing?.updatedAt === updatedAt && sameReviewDraft(existing.baseline, initial)) return current;
      return { ...current, [taskId]: { title, baseline: initial, current: initial, updatedAt } };
    });
  }, []);

  const update = useCallback((taskId: number, draft: ReviewTaskDraft) => {
    setEntries((current) => current[taskId] ? {
      ...current,
      [taskId]: { ...current[taskId], current: draft, error: undefined, conflict: false },
    } : current);
    setMessage("");
  }, []);

  const discard = useCallback((taskId: number) => {
    setEntries((current) => current[taskId] ? {
      ...current,
      [taskId]: { ...current[taskId], current: current[taskId].baseline, error: undefined, conflict: false },
    } : current);
  }, []);

  const dirty = useMemo(() => Object.entries(entries)
    .map(([taskId, value]) => ({ taskId: Number(taskId), value }))
    .filter(({ value }) => !sameReviewDraft(value.current, value.baseline)), [entries]);
  const errors = useMemo(() => Object.entries(entries).filter(([, entry]) => entry.error), [entries]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty.length) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty.length]);

  const saveAll = useCallback(async () => {
    if (saving || !dirty.length) return;
    setSaving(true);
    setMessage("");
    const localErrors = new Map<number, string>();
    const valid: ReviewTaskChange[] = [];
    for (const { taskId, value } of dirty) {
      const error = validateReviewDraft(value.current);
      if (error) localErrors.set(taskId, error);
      else valid.push({ taskId, expectedUpdatedAt: value.updatedAt, ...value.current });
    }
    let response: ReviewBatchSaveResult = { results: [] };
    try {
      if (valid.length) response = await saveAction(valid);
    } catch {
      response = { results: valid.map(({ taskId }) => ({ taskId, ok: false, code: "TECHNICAL", message: "Die Prüfentscheidung konnte technisch nicht gespeichert werden." })) };
    }
    const results = new Map(response.results.map((result) => [result.taskId, result]));
    const saved = dirty.filter(({taskId}) => !localErrors.has(taskId) && Boolean(results.get(taskId)?.ok && results.get(taskId)?.saved)).length;
    setEntries((current) => {
      const next = { ...current };
      for (const { taskId } of dirty) {
        const localError = localErrors.get(taskId);
        const result = results.get(taskId);
        if (localError) next[taskId] = { ...next[taskId], error: localError };
        else if (result?.ok && result.saved) {
          const baseline = { reviewStatus: result.saved.reviewStatus, reviewNote: result.saved.reviewNote };
          next[taskId] = { ...next[taskId], baseline, current: baseline, updatedAt: result.saved.updatedAt, error: undefined, conflict: false };
        } else next[taskId] = { ...next[taskId], error: result?.message ?? "Die Prüfentscheidung konnte nicht gespeichert werden.", conflict: result?.code === "CONFLICT" };
      }
      return next;
    });
    const failed = dirty.length - saved;
    setMessage(failed ? `${saved} gespeichert · ${failed} benötigen Aufmerksamkeit.` : `${saved} Prüfentscheidung${saved === 1 ? "" : "en"} gespeichert.`);
    setSaving(false);
    if (saved) router.refresh();
  }, [dirty, router, saveAction, saving]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("de-DE") === "s" && dirty.length) {
        event.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [dirty.length, saveAll]);

  const nextError = () => {
    if (!errors.length) return;
    const index = errorCursor % errors.length;
    const taskId = Number(errors[index][0]);
    const target = document.getElementById(`aufgabe-${taskId}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.querySelector<HTMLElement>("[aria-invalid='true'], select, textarea")?.focus({ preventScroll: true });
    setErrorCursor((index + 1) % errors.length);
  };

  const context = useMemo<ReviewContextValue>(() => ({ register, update, discard, entry: (taskId) => entries[taskId], saving }), [discard, entries, register, saving, update]);
  return <ReviewContext.Provider value={context}>
    {enabled && <aside aria-label="Prüfentscheidungen speichern" className="sticky top-0 z-40 my-4 rounded-lg border border-[var(--color-primary)] bg-white/95 px-3 py-2 shadow-md backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm"><strong>{label}</strong><span className="text-[var(--color-text-muted)]"> · {dirty.length} geändert · {errors.length} fehlerhaft</span></p>
        <div className="flex flex-wrap gap-2">
          {errors.length > 0 && <button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" onClick={nextError}>Zur nächsten fehlerhaften Prüfung · Fehler {(errorCursor % errors.length) + 1} von {errors.length}</button>}
          <button type="button" className="button-secondary !min-h-8 !px-3 !py-1 text-xs" disabled={!dirty.length || saving} onClick={() => setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, current: entry.baseline, error: undefined, conflict: false }])))}>Alle Prüfänderungen verwerfen</button>
          <button type="button" className="button-primary !min-h-8 !px-3 !py-1 text-xs" disabled={!dirty.length || saving} onClick={() => void saveAll()}>{saving ? "Speichert …" : dirty.length ? `Prüfungen speichern (${dirty.length})` : "Alles gespeichert"}</button>
        </div>
      </div>
      {message && <p className="mt-1 text-xs text-[var(--color-text-muted)]" role="status">{message}</p>}
    </aside>}
    <div onSubmitCapture={(event) => {
      if (!dirty.length) return;
      const form = event.target as HTMLFormElement;
      if (form.dataset.reviewDraft === "true") return;
      event.preventDefault();
      setMessage("Vor dieser Workflowaktion müssen die Prüfänderungen gespeichert oder verworfen werden.");
    }}>{children}</div>
  </ReviewContext.Provider>;
}

export function useReviewBatch() {
  const context = useContext(ReviewContext);
  if (!context) throw new Error("TaskReviewForm benötigt ReviewBatchProvider.");
  return context;
}
