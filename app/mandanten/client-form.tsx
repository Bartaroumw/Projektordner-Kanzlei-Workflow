"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Client } from "@prisma/client";
import type { FormState } from "@/app/mandanten/actions";
import { VAT_FILING_PERIODS } from "@/lib/validation";
import { ToastMessage } from "@/app/components/toast-message";

type ClientFormProps = {
  action: (
    state: FormState,
    formData: FormData,
  ) => Promise<FormState>;
  client?: Client;
  cancelHref: string;
  users: { id:number; fullName:string; roles:{role:string}[] }[];
};

const initialState: FormState = {};

export function ClientForm({ action, client, cancelHref, users }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <ToastMessage message={state.error} type="error" focusId={Object.keys(state.fieldErrors ?? {})[0]} />
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
        <Field label="Bearbeiter (vollständiger Name)">
          <UserSelect name="processorUserId" value={client?.processorUserId} users={users.filter(u=>u.roles.some(r=>["MITARBEITER","PRUEFER","KANZLEILEITUNG"].includes(r.role)))}/>
        </Field>
        <Field label="Prüfer (vollständiger Name)">
          <UserSelect name="reviewerUserId" value={client?.reviewerUserId} users={users.filter(u=>u.roles.some(r=>["PRUEFER","KANZLEILEITUNG"].includes(r.role)))}/>
        </Field>
        <Field label="Zuständige Kanzleileitung">
          <UserSelect name="managementUserId" value={client?.managementUserId} users={users.filter(u=>u.roles.some(r=>r.role==="KANZLEILEITUNG"))}/>
        </Field>
        <Field label="USt-Voranmeldungszeitraum" required error={errorFor("vatFilingPeriod")}>
          <select className="input" id="vatFilingPeriod" name="vatFilingPeriod" defaultValue={client?.vatFilingPeriod ?? "Monatlich"} required>
            <option value="" disabled>Bitte auswählen</option>
            {VAT_FILING_PERIODS.map((period) => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
        </Field>
      </div>
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-5">
        <h2 className="text-lg font-semibold text-[var(--color-primary-dark)]">Lohn und Rechnungswesen–Lohn-Abstimmung</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Nur bei bewusst aktiviertem Kanzleilohn wird mit einer neuen Monatscheckliste eine Abstimmung angelegt.</p>
        <label className="mt-4 flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="payrollPreparedByFirm" defaultChecked={client?.payrollPreparedByFirm ?? false} className="h-4 w-4" />
          Lohnabrechnung durch Kanzlei
        </label>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field label="Zuständiger Lohnsachbearbeiter" error={errorFor("payrollUserId")}>
            <UserSelect name="payrollUserId" value={client?.payrollUserId} users={users.filter(u=>u.roles.some(r=>r.role==="LOHNSACHBEARBEITER"))}/>
          </Field>
          <Field label="Beginn der Lohnbetreuung" error={errorFor("payrollServiceStart")}>
            <input className="input" id="payrollServiceStart" name="payrollServiceStart" type="date" defaultValue={client?.payrollServiceStart?.toISOString().slice(0,10) ?? ""}/>
          </Field>
          <Field label="Ende der Lohnbetreuung" error={errorFor("payrollServiceEnd")}>
            <input className="input" id="payrollServiceEnd" name="payrollServiceEnd" type="date" defaultValue={client?.payrollServiceEnd?.toISOString().slice(0,10) ?? ""}/>
          </Field>
        </div>
        <div className="mt-4"><Field label="Interner Hinweis zur Lohnzuständigkeit" error={errorFor("payrollResponsibilityNote")}>
          <textarea className="input min-h-24 resize-y" id="payrollResponsibilityNote" name="payrollResponsibilityNote" defaultValue={client?.payrollResponsibilityNote ?? ""} />
        </Field></div>
      </section>
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

function UserSelect({name,value,users}:{name:string;value:number|null|undefined;users:{id:number;fullName:string}[]}){return <select className="input" id={name} name={name} defaultValue={value??""}><option value="">Nicht zugeordnet</option>{users.map(user=><option key={user.id} value={user.id}>{user.fullName}</option>)}</select>}

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
