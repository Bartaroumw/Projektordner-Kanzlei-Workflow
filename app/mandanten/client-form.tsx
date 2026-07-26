"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Client } from "@prisma/client";
import type { FormState } from "@/app/mandanten/actions";
import { CADENCES } from "@/lib/validation";

type ClientFormProps = {
  action: (
    state: FormState,
    formData: FormData,
  ) => Promise<FormState>;
  client?: Client;
  cancelHref: string;
};

const initialState: FormState = {};

export function ClientForm({ action, client, cancelHref }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Mandantennummer" required error={errorFor("clientNumber")}>
          <input className="input" id="clientNumber" name="clientNumber" defaultValue={client?.clientNumber} required />
        </Field>
        <Field label="Mandantenname" required error={errorFor("name")}>
          <input className="input" id="name" name="name" defaultValue={client?.name} required />
        </Field>
        <Field label="Bearbeiter">
          <input className="input" id="processor" name="processor" defaultValue={client?.processor ?? ""} />
        </Field>
        <Field label="Prüfer">
          <input className="input" id="reviewer" name="reviewer" defaultValue={client?.reviewer ?? ""} />
        </Field>
        <Field label="Team">
          <input className="input" id="team" name="team" defaultValue={client?.team ?? ""} />
        </Field>
        <Field label="Bearbeitungsturnus" required error={errorFor("cadence")}>
          <select className="input" id="cadence" name="cadence" defaultValue={client?.cadence ?? ""} required>
            <option value="" disabled>Bitte auswählen</option>
            {CADENCES.map((cadence) => (
              <option key={cadence} value={cadence}>{cadence}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Interner Hinweis" error={errorFor("internalNote")}>
        <textarea className="input min-h-28 resize-y" id="internalNote" name="internalNote" defaultValue={client?.internalNote ?? ""} />
      </Field>
      <label className="flex items-center gap-3 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={client?.active ?? true} className="h-4 w-4" />
        Mandant ist aktiv
      </label>
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Speichern"}
        </button>
        <Link className="button-secondary" href={cancelHref}>Abbrechen</Link>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        <span className="mb-1.5 block">
          {label}{required && <span className="text-red-700"> *</span>}
        </span>
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
