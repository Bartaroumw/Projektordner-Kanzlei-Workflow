"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SaveResult = { ok: boolean; message: string };

export function TaskProcessingForm({
  action,
  statuses,
  initialStatus,
  processingNote,
  notApplicableReason,
  person,
  allowCarryForward = false,
  carryProcessingNote = false,
}: {
  action: (formData: FormData) => Promise<SaveResult>;
  statuses: readonly string[];
  initialStatus: string;
  processingNote: string | null;
  notApplicableReason: string | null;
  person?: string;
  allowCarryForward?: boolean;
  carryProcessingNote?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setResult(null);
    const response = await action(new FormData(event.currentTarget));
    setSaving(false);
    setResult(response);
    if (response.ok) {
      setDirty(false);
      router.refresh();
    }
  }

  function discard() {
    formRef.current?.reset();
    setStatus(initialStatus);
    setDirty(false);
    setResult(null);
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onChange={() => {
        setDirty(true);
        setResult(null);
      }}
      className="rounded border p-3"
    >
      <h4 className="mb-2 font-semibold">Bearbeitung</h4>
      <label className="text-xs font-semibold">Bearbeitungsstatus
        <select className="input mt-1" name="status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {statuses.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      {person && <p className="my-2 text-sm">Bearbeitet von: <strong>{person}</strong></p>}
      <label className="mt-2 block text-xs font-semibold">Bearbeitungsnotiz
        <textarea className="input mt-1 min-h-20" name="processingNote" defaultValue={processingNote ?? ""} />
      </label>
      {allowCarryForward && <label className="mt-2 flex items-start gap-2 text-sm">
        <input className="mt-1" type="checkbox" name="carryProcessingNote" defaultChecked={carryProcessingNote}/>
        <span><strong>In Folgeperiode übernehmen</strong><span className="block text-xs text-[var(--color-text-muted)]">Nur der Hinweis wird in die nächste tatsächliche Ausführung übernommen; Status und Prüfung beginnen neu.</span></span>
      </label>}
      {status === "Nicht zutreffend" && <label className="mt-2 block text-xs font-semibold">
        Begründung für „Nicht zutreffend“
        <textarea className="input mt-1 min-h-20" name="notApplicableReason" defaultValue={notApplicableReason ?? ""} required />
      </label>}
      {status !== "Nicht zutreffend" && <input type="hidden" name="notApplicableReason" value={notApplicableReason ?? ""} />}
      <div className="sticky bottom-2 mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-white/95 p-2 shadow-sm backdrop-blur">
        <button className="button-secondary" disabled={saving || !dirty}>{saving ? "Wird gespeichert …" : "Bearbeitung speichern"}</button>
        <button className="button-secondary" type="button" onClick={discard} disabled={saving || !dirty}>Änderungen verwerfen</button>
        <span className={`text-xs font-semibold ${result?.ok ? "text-[var(--color-success)]" : result ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]"}`} role="status" aria-live="polite">
          {saving ? "Wird gespeichert …" : result?.message ?? (dirty ? "Ungespeicherte Änderungen" : "Gespeichert")}
        </span>
      </div>
    </form>
  );
}

export function PendingButton({ label }: { label: string }) {
  return <button className="button-secondary mt-2">{label}</button>;
}
