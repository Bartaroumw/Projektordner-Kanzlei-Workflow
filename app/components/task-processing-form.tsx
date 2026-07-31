"use client";

import { useEffect, useMemo } from "react";
import { useChecklistBatch } from "@/app/components/checklist-batch-provider";
import type { ChecklistTaskDraft } from "@/lib/checklist-batch";

export function TaskProcessingForm({
  taskId,
  title,
  updatedAt,
  statuses,
  initialStatus,
  processingNote,
  notApplicableReason,
  person,
  allowCarryForward = false,
  carryProcessingNote = false,
}: {
  taskId: number;
  title: string;
  updatedAt: string;
  statuses: readonly string[];
  initialStatus: string;
  processingNote: string | null;
  notApplicableReason: string | null;
  person?: string;
  allowCarryForward?: boolean;
  carryProcessingNote?: boolean;
}) {
  const batch = useChecklistBatch();
  const { register } = batch;
  const initial: ChecklistTaskDraft = useMemo(() => ({
    status: initialStatus,
    processingNote: processingNote ?? "",
    notApplicableReason: notApplicableReason ?? "",
    carryProcessingNote,
  }), [carryProcessingNote, initialStatus, notApplicableReason, processingNote]);
  useEffect(() => register(taskId, title, initial, updatedAt), [initial, register, taskId, title, updatedAt]);
  const entry = batch.entry(taskId);
  const value = entry?.current ?? initial;
  const dirty = Boolean(entry && (
    entry.current.status !== entry.baseline.status ||
    entry.current.processingNote !== entry.baseline.processingNote ||
    entry.current.notApplicableReason !== entry.baseline.notApplicableReason ||
    entry.current.carryProcessingNote !== entry.baseline.carryProcessingNote
  ));
  const set = (patch: Partial<ChecklistTaskDraft>) => batch.update(taskId, { ...value, ...patch });

  return <section className="rounded border border-[var(--color-border)] bg-[var(--color-background)] p-3">
    <h4 className="mb-2 font-semibold">Bearbeitung</h4>
    <label className="text-xs font-semibold">Bearbeitungsstatus
      <select className="input mt-1" value={value.status} onChange={(event) => set({ status: event.target.value })}>
        {statuses.map((status) => <option key={status}>{status}</option>)}
      </select>
    </label>
    {person && <p className="my-2 text-sm">Bearbeitet von: <strong>{person}</strong></p>}
    <label className="mt-2 block text-xs font-semibold">Bearbeitungsnotiz
      <textarea className="input mt-1 min-h-20" value={value.processingNote} onChange={(event) => set({ processingNote: event.target.value })}/>
    </label>
    {allowCarryForward && <label className="mt-2 flex items-start gap-2 text-sm">
      <input className="mt-1" type="checkbox" checked={value.carryProcessingNote} onChange={(event) => set({ carryProcessingNote: event.target.checked })}/>
      <span><strong>Bearbeitungsnotiz in Folgeperiode übernehmen</strong> <InfoHint/></span>
    </label>}
    {value.status === "Nicht zutreffend" && <label className="mt-2 block text-xs font-semibold">
      Begründung für „Nicht zutreffend“
      <textarea className="input mt-1 min-h-20" value={value.notApplicableReason} onChange={(event) => set({ notApplicableReason: event.target.value })} required/>
    </label>}
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {dirty && <><span className="text-xs font-semibold text-[var(--color-text-muted)]">● Ungespeicherte Änderungen</span><button className="button-secondary" type="button" disabled={batch.saving} onClick={() => batch.discard(taskId)}>Änderungen dieser Aufgabe verwerfen</button></>}
      {!dirty && <span className="text-xs font-semibold text-[var(--color-text-muted)]">Gespeichert</span>}
    </div>
    {entry?.error && <div className="mt-3 rounded border border-[var(--color-error)] bg-red-50 p-3 text-sm text-[var(--color-error)]" role="alert">{entry.error}{entry.conflict && <span className="mt-1 block">Ihre Eingaben wurden nicht überschrieben. Laden Sie den aktuellen Stand erst nach eigener Prüfung neu.</span>}</div>}
  </section>;
}

export function PendingButton({ label }: { label: string }) {
  return <button className="button-secondary mt-2">{label}</button>;
}

function InfoHint() {
  return <span className="group relative inline-flex">
    <button type="button" aria-label="Information zur Übernahme der Bearbeitungsnotiz" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-primary-dark)]">i</button>
    <span role="tooltip" className="pointer-events-none absolute bottom-7 left-0 z-20 hidden w-72 rounded border border-[var(--color-border)] bg-white p-3 text-xs font-normal shadow-lg group-hover:block group-focus-within:block">
      Nur die Bearbeitungsnotiz wird in die nächste tatsächliche Ausführung übernommen. Bearbeitungsstatus, Prüfstatus und die Begründung für „Nicht zutreffend“ beginnen dort neu.
    </span>
  </span>;
}
