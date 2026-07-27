"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function TaskProcessingForm({
  action,
  statuses,
  initialStatus,
  processingNote,
  notApplicableReason,
  person,
}: {
  action: (formData: FormData) => void | Promise<void>;
  statuses: readonly string[];
  initialStatus: string;
  processingNote: string | null;
  notApplicableReason: string | null;
  person?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  return (
    <form action={action} className="rounded border p-3">
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
      {status === "Nicht zutreffend" && <label className="mt-2 block text-xs font-semibold">
        Begründung für „Nicht zutreffend“
        <textarea className="input mt-1 min-h-20" name="notApplicableReason" defaultValue={notApplicableReason ?? ""} required />
      </label>}
      {status !== "Nicht zutreffend" && <input type="hidden" name="notApplicableReason" value={notApplicableReason ?? ""} />}
      <PendingButton label="Bearbeitung speichern" />
    </form>
  );
}

export function PendingButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button-secondary mt-2" disabled={pending}>{pending ? "Wird gespeichert …" : label}</button>;
}
