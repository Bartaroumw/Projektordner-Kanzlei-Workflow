"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";

export function TaskTransferForm({
  action,
  targetLabel,
  targetYear,
  targetMonth,
  person,
}: {
  action: (formData: FormData) => void | Promise<void>;
  targetLabel: string;
  targetYear: number;
  targetMonth: number;
  person: string;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details ref={details} className="rounded border border-[var(--color-border)] bg-white p-3">
      <summary className="cursor-pointer font-semibold text-[var(--color-primary-dark)]">Übertragung vorschlagen</summary>
      <form action={action} data-workflow-action="true" className="mt-3 max-w-3xl">
        <p className="mb-3 text-sm">Ziel: <strong>{targetLabel}</strong> · Bearbeitet von: <strong>{person}</strong></p>
        <input type="hidden" name="transferTargetYear" value={targetYear} />
        <input type="hidden" name="transferTargetMonth" value={targetMonth} />
        <label className="block text-xs font-semibold">Verpflichtende Begründung
          <textarea className="input mt-1 min-h-20" name="transferReason" required />
        </label>
        <label className="mt-2 block text-xs font-semibold">Erwartete Unterlage oder nächste Handlung
          <textarea className="input mt-1 min-h-20" name="transferExpectedAction" required />
        </label>
        <label className="mt-2 block text-xs font-semibold">Zusätzlicher Hinweis (optional)
          <textarea className="input mt-1 min-h-20" name="transferNote" />
        </label>
        <div className="mt-3 flex gap-2">
          <TransferButton />
          <button className="button-secondary" type="button" onClick={() => { if (details.current) details.current.open = false; }}>Abbrechen</button>
        </div>
      </form>
    </details>
  );
}

function TransferButton() {
  const { pending } = useFormStatus();
  return <button className="button-primary" disabled={pending}>{pending ? "Vorschlag wird gespeichert …" : "Übertragung vorschlagen"}</button>;
}
