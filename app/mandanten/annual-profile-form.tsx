"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { AnnualProfile } from "@prisma/client";
import type { FormState } from "@/app/mandanten/actions";
import { LEGAL_FORM_GROUPS, PROFIT_METHODS } from "@/lib/validation";

type ProfileFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  profile?: Partial<AnnualProfile>;
  cancelHref: string;
  copiedFromYear?: number;
};

const booleanFields = [
  ["hasCashRegister", "Kasse vorhanden"],
  ["hasPayroll", "Lohn vorhanden"],
  ["hasFixedAssets", "Anlagevermögen vorhanden"],
  ["hasReceivablesPayables", "Debitoren/Kreditoren vorhanden"],
  ["hasLoans", "Darlehen vorhanden"],
  ["subjectToVat", "Umsatzsteuerpflichtig"],
  ["hasPermanentExtension", "Dauerfristverlängerung vorhanden"],
] as const;

export function AnnualProfileForm({
  action,
  profile,
  cancelHref,
  copiedFromYear,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [legalForm, setLegalForm] = useState(
    profile?.legalFormGroup ?? "Einzelunternehmen",
  );
  const [profitMethod, setProfitMethod] = useState(
    profile?.profitDeterminationMethod ?? "Einnahmenüberschussrechnung",
  );
  const corporate = legalForm === "Kapitalgesellschaft";

  return (
    <form action={formAction} className="space-y-6">
      {copiedFromYear && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Die Werte wurden aus dem Jahresprofil {copiedFromYear} übernommen. Bitte prüfen und bestätigen Sie alle Angaben.
        </div>
      )}
      {state.error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <div className="grid gap-5 md:grid-cols-3">
        <Field label="Kalenderjahr" error={state.fieldErrors?.calendarYear?.[0]}>
          <input className="input" type="number" min="2000" max="2100" id="calendarYear" name="calendarYear" defaultValue={profile?.calendarYear ?? new Date().getFullYear()} required />
        </Field>
        <Field label="Rechtsformgruppe" error={state.fieldErrors?.legalFormGroup?.[0]}>
          <select
            className="input"
            id="legalFormGroup"
            name="legalFormGroup"
            value={legalForm}
            onChange={(event) => {
              const value = event.target.value;
              setLegalForm(value);
              if (value === "Kapitalgesellschaft") {
                setProfitMethod("Bilanzierung");
              }
            }}
          >
            {LEGAL_FORM_GROUPS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Gewinnermittlungsart" error={state.fieldErrors?.profitDeterminationMethod?.[0]}>
          <select
            className="input"
            id="profitDeterminationMethod"
            name="profitDeterminationMethod"
            value={corporate ? "Bilanzierung" : profitMethod}
            onChange={(event) => setProfitMethod(event.target.value)}
          >
            {(corporate ? ["Bilanzierung"] : PROFIT_METHODS).map((value) => <option key={value}>{value}</option>)}
          </select>
          {corporate && <p className="mt-1 text-xs text-slate-500">Für Kapitalgesellschaften automatisch festgelegt.</p>}
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {booleanFields.map(([name, label]) => (
          <label key={name} className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium">
            <input type="checkbox" name={name} defaultChecked={Boolean(profile?.[name])} className="h-4 w-4" />
            {label}
          </label>
        ))}
      </div>
      <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <input type="checkbox" name="confirmed" className="mt-0.5 h-4 w-4" required />
        <span>Ich habe die Angaben für dieses Kalenderjahr geprüft. Das Profil gilt ausschließlich für dieses Jahr und verändert keine früheren Jahresprofile.</span>
      </label>
      {state.fieldErrors?.confirmed?.[0] && <p className="text-sm text-red-700">{state.fieldErrors.confirmed[0]}</p>}
      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? "Wird gespeichert …" : "Jahresprofil speichern"}
        </button>
        <Link className="button-secondary" href={cancelHref}>Abbrechen</Link>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700">
        <span className="mb-1.5 block">{label} <span className="text-red-700">*</span></span>
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
