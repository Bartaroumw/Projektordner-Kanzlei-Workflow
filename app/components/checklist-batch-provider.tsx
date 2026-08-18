"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  sameTaskDraft,
  validateTaskDraft,
  type ChecklistBatchSaveResult,
  type ChecklistTaskChange,
  type ChecklistTaskDraft,
} from "@/lib/checklist-batch";

type Entry = {
  title: string;
  baseline: ChecklistTaskDraft;
  current: ChecklistTaskDraft;
  updatedAt: string;
  error?: string;
  conflict?: boolean;
};

type ContextValue = {
  register: (taskId: number, title: string, initial: ChecklistTaskDraft, updatedAt: string) => void;
  update: (taskId: number, draft: ChecklistTaskDraft) => void;
  discard: (taskId: number) => void;
  entry: (taskId: number) => Entry | undefined;
  dirtyCount: number;
  saving: boolean;
  saveAll: () => Promise<number>;
  requestDiscardAll: () => void;
  message: string;
  localCompletedTasks: number;
};

const BatchContext = createContext<ContextValue | null>(null);

export function ChecklistBatchProvider({
  children,
  saveAction,
  totalTasks,
  serverCompletedTasks,
}: {
  children: React.ReactNode;
  saveAction: (changes: ChecklistTaskChange[]) => Promise<ChecklistBatchSaveResult>;
  totalTasks: number;
  serverCompletedTasks: number;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const register = useCallback((taskId: number, title: string, initial: ChecklistTaskDraft, updatedAt: string) => {
    setEntries((current) => {
      const existing = current[taskId];
      if (existing) {
        if (!sameTaskDraft(existing.current, existing.baseline)) return current;
        if (existing.updatedAt === updatedAt && sameTaskDraft(existing.baseline, initial)) return current;
      }
      return { ...current, [taskId]: { title, baseline: initial, current: initial, updatedAt } };
    });
  }, []);

  const update = useCallback((taskId: number, draft: ChecklistTaskDraft) => {
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

  const dirtyEntries = useMemo(
    () => Object.entries(entries)
      .map(([taskId, value]) => ({ taskId: Number(taskId), value }))
      .filter(({ value }) => !sameTaskDraft(value.current, value.baseline)),
    [entries],
  );
  const localCompletedTasks = useMemo(() => {
    const completed = (status: string) =>
      ["Erledigt", "Nicht zutreffend", "Übertragung vorgeschlagen", "In Folgemonat übertragen"].includes(status);
    return Math.max(0, Math.min(totalTasks, serverCompletedTasks + Object.values(entries).reduce(
      (difference, value) =>
        difference + Number(completed(value.current.status)) - Number(completed(value.baseline.status)),
      0,
    )));
  }, [entries, serverCompletedTasks, totalTasks]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyEntries.length) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtyEntries.length]);

  const saveAll = useCallback(async () => {
    if (saving || !dirtyEntries.length) return 0;
    setSaving(true);
    setMessage("");
    const localErrors = new Map<number, string>();
    const valid: ChecklistTaskChange[] = [];
    for (const { taskId, value } of dirtyEntries) {
      const error = validateTaskDraft(value.current);
      if (error) localErrors.set(taskId, error);
      else valid.push({ taskId, expectedUpdatedAt: value.updatedAt, ...value.current });
    }
    let response: ChecklistBatchSaveResult = { results: [] };
    try {
      if (valid.length) response = await saveAction(valid);
    } catch {
      response = { results: valid.map(({taskId}) => ({ taskId, ok: false, code: "TECHNICAL", message: "Die Änderung konnte technisch nicht gespeichert werden. Ihre Eingaben bleiben erhalten." })) };
    }
    const results = new Map(response.results.map((result) => [result.taskId, result]));
    const failed = dirtyEntries
      .map(({ taskId }) => taskId)
      .filter((taskId) => localErrors.has(taskId) || !results.get(taskId)?.ok);
    const saved = dirtyEntries.length - failed.length;
    setEntries((current) => {
      const next = { ...current };
      for (const { taskId } of dirtyEntries) {
        const localError = localErrors.get(taskId);
        const result = results.get(taskId);
        if (localError) {
          next[taskId] = { ...next[taskId], error: localError };
        } else if (result?.ok && result.saved) {
          const baseline: ChecklistTaskDraft = {
            status: result.saved.status,
            processingNote: result.saved.processingNote,
            notApplicableReason: result.saved.notApplicableReason,
            carryProcessingNote: result.saved.carryProcessingNote,
          };
          next[taskId] = { ...next[taskId], baseline, current: baseline, updatedAt: result.saved.updatedAt, error: undefined, conflict: false };
        } else {
          next[taskId] = { ...next[taskId], error: result?.message ?? "Die Aufgabe konnte nicht gespeichert werden.", conflict: result?.code === "CONFLICT" };
        }
      }
      return next;
    });
    setMessage(
      failed.length
        ? `${saved ? saved === 1 ? "1 Aufgabe wurde gespeichert. " : `${saved} Aufgaben wurden gespeichert. ` : ""}${failed.length} ${failed.length === 1 ? "Aufgabe benötigt" : "Aufgaben benötigen"} noch Ihre Aufmerksamkeit.`
        : saved === 1 ? "Die Änderung wurde gespeichert." : `${saved} Aufgaben wurden gespeichert.`,
    );
    setSaving(false);
    if (saved) router.refresh();
    return failed.length;
  }, [dirtyEntries, router, saveAction, saving]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase("de-DE") === "s" && dirtyEntries.length) {
        event.preventDefault();
        void saveAll();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [dirtyEntries.length, saveAll]);

  const value = useMemo<ContextValue>(() => ({
    register,
    update,
    discard,
    entry: (taskId) => entries[taskId],
    dirtyCount: dirtyEntries.length,
    saving,
    saveAll,
    requestDiscardAll: () => setDiscardOpen(true),
    message,
    localCompletedTasks,
  }), [dirtyEntries.length, discard, entries, localCompletedTasks, message, register, saveAll, saving, update]);

  return <BatchContext.Provider value={value}>
    <div
      onClickCapture={(event) => {
        if (!dirtyEntries.length) return;
        const target = event.target as HTMLElement;
        const anchor = target.closest("a");
        const href = anchor?.getAttribute("href");
        if (!href || href.startsWith("#") || anchor?.getAttribute("target") === "_blank") return;
        event.preventDefault();
        setPendingHref(href);
      }}
      onSubmitCapture={(event) => {
        if (!dirtyEntries.length) return;
        const form = event.target as HTMLFormElement;
        event.preventDefault();
        setMessage(
          form.dataset.workflowAction === "true"
            ? "Vor dieser Workflowaktion müssen die noch offenen Änderungen gespeichert oder verworfen werden."
            : "Vor dieser Aktion müssen die noch offenen Änderungen gespeichert oder verworfen werden.",
        );
      }}
    >
      {children}
    </div>
    {discardOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div aria-modal="true" role="dialog" aria-labelledby="discard-title" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="discard-title" className="text-xl font-semibold">Alle Änderungen verwerfen?</h2>
        <p className="mt-2 text-sm">Möchten Sie die ungespeicherten Änderungen an {dirtyEntries.length} {dirtyEntries.length === 1 ? "Aufgabe" : "Aufgaben"} wirklich verwerfen?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="button-secondary" type="button" onClick={() => setDiscardOpen(false)}>Abbrechen</button>
          <button className="button-primary" type="button" onClick={() => {
            setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, value]) => [id, { ...value, current: value.baseline, error: undefined, conflict: false }])));
            setDiscardOpen(false);
            setMessage("Alle ungespeicherten Änderungen wurden verworfen.");
          }}>Änderungen verwerfen</button>
        </div>
      </div>
    </div>}
    {pendingHref && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation">
      <div aria-modal="true" role="dialog" aria-labelledby="leave-title" className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="leave-title" className="text-xl font-semibold">Ungespeicherte Änderungen</h2>
        <p className="mt-2 text-sm">Es bestehen ungespeicherte Änderungen an {dirtyEntries.length} {dirtyEntries.length === 1 ? "Aufgabe" : "Aufgaben"}.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button className="button-secondary" type="button" onClick={() => setPendingHref(null)}>Abbrechen</button>
          <button className="button-secondary" type="button" onClick={() => {
            const destination=pendingHref;
            setPendingHref(null);
            router.push(destination);
          }}>Ohne Speichern verlassen</button>
          <button className="button-primary" type="button" disabled={saving} onClick={async () => {
            const destination=pendingHref;
            const failed=await saveAll();
            if(!failed&&destination){setPendingHref(null);router.push(destination);}
          }}>Alle Änderungen speichern</button>
        </div>
      </div>
    </div>}
  </BatchContext.Provider>;
}

export function useChecklistBatch() {
  const context = useContext(BatchContext);
  if (!context) throw new Error("TaskProcessingForm benötigt ChecklistBatchProvider.");
  return context;
}
